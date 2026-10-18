export class CPU6502 {
    constructor(memory) {
        this.mem = memory;

        // Registers
        this.A = 0;
        this.X = 0;
        this.Y = 0;
        this.SP = 0xFD;
        this.PC = 0;

        // Flags
        this.C = 0;
        this.Z = 0;
        this.I = 1;
        this.D = 0;
        this.B = 0;
        this.V = 0;
        this.N = 0;

        this.cycles = 0;
        this.initTable();
    }
    
    
    // --- Helpers ---

    updateZN(val) {
        this.Z = (val === 0)?1:0;
        this.N = (val & 0x80)?1:0;
    }

    pushStack(val) {
        this.mem.writeb(0x0100 + this.SP, val & 0xFF);
        this.SP = (this.SP - 1) & 0xFF;
    }
    
    getStatusFlags(breakFlag=false) {
        let p=0;
        p |= (this.N << 7);
        p |= (this.V << 6);
        p |= (1 << 5); // Bit 5 is always 1 on the 6502
        p |= (breakFlag ? (1 << 4) : 0); // Flag B
        p |= (this.D << 3);
        p |= (this.I << 2);
        p |= (this.Z << 1);
        return p;
    }


    // --- Addressing Modes ---
    
    // Immediate
    modeIMM() {
        const addr = this.PC;
        this.PC++;
        return addr;  
    }

    // Implied
    modeIMP() {
        return 0;
    }
    
    // Zero Page
    modeZP() {
        const addr = this.mem.readb(this.PC);
        this.PC++;
        return addr;
    }
    
    // Zero Page, X
    modeZPX() {
        const addr = (this.mem.readb(this.PC) + this.X) & 0xFF;
        this.PC++;
        return addr;
    }
    
    // Zero Page, Y
    modeZPY() {
        const addr = (this.mem.readb(this.PC) + this.Y) & 0xFF;
        this.PC++;
        return addr;
    }
    
    // Indirect, X
    modeINDX() {
        let zp = (this.mem.readb(this.PC) + this.X) & 0xFF;
        this.PC++;
        const lo = this.mem.readb(zp);
        const hi = this.mem.readb((zp + 1) & 0xFF); // Wrap-around na zero page
        return (hi << 8) | lo;
    }
    
    // Indirect, Y
    modeINDY() {
        const zp = this.mem.readb(this.PC);
        this.PC++;
        const lo = this.mem.readb(zp);
        const hi = this.mem.readb((zp + 1) & 0xFF);
        const base = (hi << 8) | lo;
        return (base + this.Y) & 0xFFFF;
    }
    
    // Absolute (16-bit)
    modeABS() {
        const lo = this.mem.readb(this.PC);
        const hi = this.mem.readb(this.PC+1);
        this.PC += 2;
        return (hi << 8) | lo;
    }
    
    // Absolute, X
    modeABSX() {
        const lo = this.mem.readb(this.PC);
        const hi = this.mem.readb(this.PC+1);
        this.PC += 2;
        const base = (hi << 8) | lo;
        return (base + this.X) & 0xFFFF;
    }

    // Absolute, Y
    modeABSY() {
        const lo = this.mem.readb(this.PC);
        const hi = this.mem.readb(this.PC+1);
        this.PC += 2;
        const base = (hi << 8) | lo;
        return (base + this.Y) & 0xFFFF;
    }


    // --- Instructions ---

    OP_UNKNOWN(opcode) {
        const hexOp = opcode
            .toString(16)
            .padStart(2, '0')
            .toUpperCase();
        const hexPC = (this.PC - 1)
            .toString(16)
            .padStart(4, '0')
            .toUpperCase();
        console.log(`Unknown opcode: 0x${hexOp} at PC: 0x${hexPC}`);
        return 2;
    }

    // 0x00: BRK
    OP_BRK() {
        const pushPC = (this.PC+1) & 0xFFFF;
        this.pushStack(pushPC >> 8);
        this.pushStack(pushPC & 0xFF);
        this.pushStack(this.getStatusFlags(true));
        this.I=1;
        const lo = this.mem.readb(0xFFFE);
        const hi = this.mem.readb(0xFFFF);
        this.PC = (hi << 8) | lo;
        return 7;
    }
    
    // 0xA1: LDA (Indirect, X)
    OP_LDA_INDX() {
        const addr = this.modeINDX();
        this.A = this.mem.readb(addr);
        this.updateZN(this.A);
        return 6;
    }
    
    // 0xA2: LDX Immediate
    OP_LDX_IMM() {
        const addr = this.modeIMM();
        this.X = this.mem.readb(addr);
        this.updateZN(this.X);
        return 2;
    }

    // 0xA5: LDA Zero Page
    OP_LDA_ZP() {
        const addr = this.modeZP();
        this.A = this.mem.readb(addr);
        this.Z = this.A === 0?1:0;
        this.N = (this.A & 0x80)?1:0;
        return 3;
    }
    
    // 0xA9: LDA Immediate
    OP_LDA_IMM() {
        const addr = this.modeIMM();
        this.A = this.mem.readb(addr);
        this.Z = this.A === 0?1:0;
        this.N = (this.A & 0x80)?1:0;
        return 2;
    }
    
    // 0xAD: LDA Absolute
    OP_LDA_ABS() {
        const addr = this.modeABS();
        this.A = this.mem.readb(addr);
        this.updateZN(this.A);
        return 4;
    }
    
    // 0xB1: LDA (Indirect), Y
    OP_LDA_INDY() {
        const addr = this.modeINDY();
        this.A = this.mem.readb(addr);
        this.updateZN(this.A);
        return 5;
    }

    // 0xB5: LDA Zero Page, X
    OP_LDA_ZPX() {
        const addr = this.modeZPX();
        this.A = this.mem.readb(addr);
        this.updateZN(this.A);
        return 4;
    }
    
    // 0xB6: LDX Zero Page, Y
    OP_LDX_ZPY() {
        const addr = this.modeZPY();
        this.X = this.mem.readb(addr);
        this.updateZN(this.X);
        return 4;
    }

    // 0xB9: LDA Absolute, Y
    OP_LDA_ABSY() {
        const addr = this.modeABSY();
        this.A = this.mem.readb(addr);
        this.updateZN(this.A);
        return 4;
    }
    
    // 0xBD: LDA Absolute, X
    OP_LDA_ABSX() {
        const addr = this.modeABSX();
        this.A = this.mem.readb(addr);
        this.updateZN(this.A);
        return 4;
    }


    // --- Opcode Table ---
    
    initTable() {
        this.table = new Array(256).fill(null)

        this.table[0x00] = {
            name: "BRK",
            exec: () => this.OP_BRK()
        };
        
        this.table[0xA1] = {
            name: "LDA_INDX",
            exec: () => this.OP_LDA_INDX()
        };
        
        this.table[0xA2] = {
            name: "LDX_IMM",
            exec: () => this.OP_LDX_IMM()
        };

        this.table[0xA5] = {
            name: "LDA_ZP",
            exec: () => this.OP_LDA_ZP()
        };
        
        this.table[0xA9] = {
            name: "LDA_IMM",
            exec: () => this.OP_LDA_IMM()
        };
        
        this.table[0xAD] = {
            name: "LDA_ABS",
            exec: () => this.OP_LDA_ABS()
        };
        
        this.table[0xB1] = {
            name: "LDA_INDY",
            exec: () => this.OP_LDA_INDY()
        };
        
        this.table[0xB5] = {
            name: "LDA_ZPX",
            exec: () => this.OP_LDA_ZPX()
        };
        
        this.table[0xB6] = {
            name: "LDX_ZPY",
            exec: () => this.OP_LDX_ZPY()
        };

        this.table[0xB9] = {
            name: "LDA_ABSY",
            exec: () => this.OP_LDA_ABSY()
        };
        
        this.table[0xBD] = {
            name: "LDA_ABSX",
            exec: () => this.OP_LDA_ABSX()
        };
    }


    // --- CPU Control ---

    cpuInit() {
        console.log("CPU6502 initialized");
        this.cpuReset();
    }

    cpuReset() {
        this.PC = this.mem.readw(0xFFFC);
        this.A = 0;
        this.X = 0;
        this.Y = 0;
        this.SP = 0xFD;
        this.C = 0; 
        this.Z = 0; 
        this.I = 1;
        this.D = 0; 
        this.B = 0; 
        this.V = 0; 
        this.N = 0;
        this.cycles = 0;
    }

    cpuStep() {
        const op = this.mem.readb(this.PC++);
        const instruction = this.table[op];
        
        if (!instruction) {
            const cycles = this.OP_UNKNOWN(op);
            this.cycles += cycles;
            return cycles;
        }
    
        const cycles = instruction.exec();
        this.cycles += cycles;
        return cycles;
    }
}
