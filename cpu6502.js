export class CPU6502 {
    constructor(memory, domPrinter) {
        this.mem = memory;

        // Registers
        this.A = 0;
        this.X = 0;
        this.Y = 0;
        this.SP = 0xFD;
        this.PC = 0;

        // Flags
        this.C = 0; this.Z = 0; this.I = 1;
        this.D = 0; this.B = 0; this.V = 0; this.N = 0;

        this.cycles = 0;
        this.initTable();

        this.domPrinter = domPrinter;
    }
    
    
    // --- Helpers ---

    updateZN(val) {
        this.Z = (val === 0)?1:0;
        this.N = (val & 0x80)?1:0;
    }


    // --- Addressing Modes ---
    
    modeIMM() {
        const addr = this.PC;
        this.PC++;
        return addr;  
    }

    modeIMP() {
        return 0;
    }
    
    modeZP() {
        const addr = this.mem.readb(this.PC);
        this.PC++;
        return addr;
    }
    
    modeZPX() {
        const addr = (this.mem.readb(this.PC) + this.X) & 0xFF;
        this.PC++;
        return addr;
    }
    
    modeZPY() {
        const addr = (this.mem.readb(this.PC) + this.Y) & 0xFF;
        this.PC++;
        return addr;
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
        console.warn(`Unknown opcode: 0x${hexOp} at PC: 0x${hexPC}`);
        return 2;
    }

    // 0x00: BRK
    OP_BRK() {
        return 7;
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


    // --- Opcode Table ---
    
    initTable() {
        this.table = new Array(256)
            .fill(null)
            .map((_, index) => ({
                name: "UNKNOWN",
                exec: () => this.OP_UNKNOWN(index)
            }));

        this.table[0x00] = {
            name: "BRK",
            exec: () => this.OP_BRK()
        };

        this.table[0xA5] = {
            name: "LDA_ZP",
            exec: () => this.OP_LDA_ZP()
        };
        
        this.table[0xA9] = {
            name: "LDA_IMM",
            exec: () => this.OP_LDA_IMM()
        };
        
        this.table[0xB5] = {
            name: "LDA_ZPX",
            exec: () => this.OP_LDA_ZPX()
        };
        
        this.table[0xB6] = {
            name: "LDX_ZPY",
            exec: () => this.OP_LDX_ZPY()
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
            const hexOp = op.toString(16).toUpperCase().padStart(2, '0');
            this.domPrinter.log(`Unknown opcode: 0x${hexOp}`);
        }
    
        const cycles = instruction.exec();
        this.cycles += cycles;
        return cycles;
    }
}
