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

    OP(code, name, fn) {
        this.table[code] = {name,exec: fn};
    }

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
    // Relative
    modeREL() {
        const offset = this.mem.readb(this.PC);
        this.PC++;
        if (offset & 0x80) offset |= 0xFF00; // Sign extend
        return offset;
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
        // break to irq handler
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
    // 0x01: ORA (Indirect, X)
    OP_ORA_INDX() {
        // ORs A with the value, set Z and N
        const addr = this.modeINDX();
        this.A |= this.mem.readb(addr);
        this.updateZN(this.A);
        return 6;
    }
    // 0x05: ORA Zero Page
    OP_ORA_ZP() {
        // ORs A with the value, set Z and N
        const addr = this.modeZP();
        this.A |= this.mem.readb(addr);
        this.updateZN(this.A);
        return 3;
    }
    // 0x06: ASL Zero Page
    OP_ASL_ZP() {
        // shifts a memory location left 1, set C, Z and N
        const addr = this.modeZP();
        let val = this.mem.readb(addr);
        this.C = (val & 0x80)?1:0;
        val = (val << 1) & 0xFF;
        this.mem.writeb(addr, val);
        this.updateZN(val);
        return 5;
    }
    // 0x08: PHP
    OP_PHP() {
        // pushes the flags to the stack
        this.modeIMP();
        this.pushStack(this.getStatusFlags(true));
        return 3;
    }
    // 0x09: ORA Immediate
    OP_ORA_IMM() {
        // ORs A with the value, set Z and N
        const addr = this.modeIMM();
        this.A |= this.mem.readb(addr);
        this.updateZN(this.A);
        return 2;
    }
    // 0x0A: ASL Accumulator
    OP_ASL_ACC() {
        // shifts A left 1, set C, Z and N
        this.modeIMP();
        this.C = (this.A & 0x80)?1:0;
        this.A = (this.A << 1) & 0xFF;
        this.updateZN(this.A);
        return 2;
    }
    // 0x0D: ORA Absolute
    OP_ORA_ABS() {
        // ORs A with the value, set Z and N
        const addr = this.modeABS();
        this.A |= this.mem.readb(addr);
        this.updateZN(this.A);
        return 4;
    }
    // 0x8A: TXA
    OP_TXA() {
        // transfers x to a, sets Z and N
        this.modeIMP();
        this.A = this.X;
        this.updateZN(this.A);
        return 2;
    }
    // 0xA0: LDY Immediate
    OP_LDY_IMM() {
        // loads a value in y, sets Z and N
        const addr = this.modeIMM();
        this.Y = this.mem.readb(addr);
        this.updateZN(this.Y);
        return 2;
    }
    // 0xA1: LDA (Indirect, X)
    OP_LDA_INDX() {
        // loads a value in a, sets Z and N
        const addr = this.modeINDX();
        this.A = this.mem.readb(addr);
        this.updateZN(this.A);
        return 6;
    }
    // 0xA2: LDX Immediate
    OP_LDX_IMM() {
        // loads x value in x, sets Z and N
        const addr = this.modeIMM();
        this.X = this.mem.readb(addr);
        this.updateZN(this.X);
        return 2;
    }
    // 0xA4: LDY Zero Page
    OP_LDY_ZP() {
        // loads a value in y, sets Z and N
        const addr = this.modeZP();
        this.Y = this.mem.readb(addr);
        this.updateZN(this.Y);
        return 3;
    }
    // 0xA5: LDA Zero Page
    OP_LDA_ZP() {
        // loads a value in a, sets Z and N
        const addr = this.modeZP();
        this.A = this.mem.readb(addr);
        this.Z = this.A === 0?1:0;
        this.N = (this.A & 0x80)?1:0;
        return 3;
    }
    // 0xA6: LDX Zero Page
    OP_LDX_ZP() {
        // loads x value in x, sets Z and N
        const addr = this.modeZP();
        this.X = this.mem.readb(addr);
        this.updateZN(this.X);
        return 3;
    }
    // 0xA8 TAY
    OP_TAY() {
        // transfers a to y, sets Z and N
        this.modeIMP();
        this.Y = this.A;
        this.updateZN(this.Y);
        return 2;
    }
    // 0xA9: LDA Immediate
    OP_LDA_IMM() {
        // loads a value in a, sets Z and N
        const addr = this.modeIMM();
        this.A = this.mem.readb(addr);
        this.Z = this.A === 0?1:0;
        this.N = (this.A & 0x80)?1:0;
        return 2;
    }
    // 0xAA: TAX
    OP_TAX() {
        // transfers a to x, sets Z and N
        this.modeIMP();
        this.X = this.A;
        this.updateZN(this.X);
        return 2;
    }
    // 0xAC: LDY Absolute
    OP_LDY_ABS() {
    // loads a value in y, sets Z and N
        const addr = this.modeABS();
        this.Y = this.mem.readb(addr);
        this.updateZN(this.Y);
        return 4;
    }
    // 0xAD: LDA Absolute
    OP_LDA_ABS() {
        // loads a value in a, sets Z and N
        const addr = this.modeABS();
        this.A = this.mem.readb(addr);
        this.updateZN(this.A);
        return 4;
    }
    // 0xAE: LDX Absolute
    OP_LDX_ABS() {
        // loads x value in x, sets Z and N
        const addr = this.modeABS();
        this.X = this.mem.readb(addr);
        this.updateZN(this.X);
        return 4;
    }
    // 0xB1: LDA (Indirect), Y
    OP_LDA_INDY() {
        // loads a value in a, sets Z and N
        const addr = this.modeINDY();
        this.A = this.mem.readb(addr);
        this.updateZN(this.A);
        return 5;
    }
    // 0xB4: LDY Zero Page, X
    OP_LDY_ZPX() {
        // loads a value in y, sets Z and N
        const addr = this.modeZPX();
        this.Y = this.mem.readb(addr);
        this.updateZN(this.Y);
        return 4;
    }
    // 0xB5: LDA Zero Page, X
    OP_LDA_ZPX() {
        // loads a value in a, sets Z and N
        const addr = this.modeZPX();
        this.A = this.mem.readb(addr);
        this.updateZN(this.A);
        return 4;
    }
    // 0xB6: LDX Zero Page, Y
    OP_LDX_ZPY() {
        // loads x value in x, sets Z and N
        const addr = this.modeZPY();
        this.X = this.mem.readb(addr);
        this.updateZN(this.X);
        return 4;
    }
    // 0xB8: CLV
    OP_CLV() {
        // clear overflow flag
        this.modeIMP();
        this.V=0;
        return 2;
    }
    // 0xB9: LDA Absolute, Y
    OP_LDA_ABSY() {
        // loads a value in a, sets Z and N
        const addr = this.modeABSY();
        this.A = this.mem.readb(addr);
        this.updateZN(this.A);
        return 4;
    }
    // 0xBA: TSX
    OP_TSX() {
        // transfers the stack pointer to x, sets Z and N
        this.modeIMP();
        this.X = this.SP;
        this.updateZN(this.X);
        return 2;
    }
    // 0xBC: LDY Absolute, X
    OP_LDY_ABSX() {
        // loads a value in y, sets Z and N
        const addr = this.modeABSX();
        this.Y = this.mem.readb(addr);
        this.updateZN(this.Y);
        return 4;
    }
    // 0xBD: LDA Absolute, X
    OP_LDA_ABSX() {
        // loads a value in a, sets Z and N
        const addr = this.modeABSX();
        this.A = this.mem.readb(addr);
        this.updateZN(this.A);
        return 4;
    }
    // 0xBE: LDX Absolute, Y
    OP_LDX_ABSY() {
        // loads x value in x, sets Z and N
        const addr = this.modeABSY();
        this.X = this.mem.readb(addr);
        this.updateZN(this.X);
        return 4;
    }
    // 0xD0: BNE
    OP_BNE() {
        // branches if Z is 0
        const offset = this.modeREL();
        let cycles = 2;
        if (this.Z===0) {
            cycles++;
            this.PC = (this.PC + offset) & 0xFFFF;
        }
        return cycles;
    }


    // --- Opcode Table ---
    
    initTable() {
        this.table = new Array(256).fill(null);
        this.OP(0x00, "BRK", () => this.OP_BRK());
        this.OP(0x01, "ORA_INDX", () => this.OP_ORA_INDX());
        this.OP(0x05, "ORA_ZP", () => this.OP_ORA_ZP());
        this.OP(0x06, "ASL_ZP", () => this.OP_ASL_ZP());
        this.OP(0x08, "PHP", () => this.OP_PHP());
        this.OP(0x09, "ORA_IMM", () => this.OP_ORA_IMM());
        this.OP(0x0A, "ASL_ACC", () => this.OP_ASL_ACC());
        this.OP(0x0D, "ORA_ABS", () => this.OP_ORA_ABS());
        this.OP(0x8A, "TXA", () => this.OP_TXA());
        this.OP(0xA0, "LDY_IMM", () => this.OP_LDY_IMM());
        this.OP(0xA1, "LDA_INDX", () => this.OP_LDA_INDX());     
        this.OP(0xA2, "LDX_IMM",() => this.OP_LDX_IMM());
        this.OP(0xA4, "LDY_ZP", () => this.OP_LDY_ZP());
        this.OP(0xA5, "LDA_ZP", () => this.OP_LDA_ZP());
        this.OP(0xA6, "LDX_ZP", () => this.OP_LDX_ZP());
        this.OP(0xA8, "TAY", () => this.OP_TAY());
        this.OP(0xA9, "LDA_IMM", () => this.OP_LDA_IMM());
        this.OP(0xAA, "TAX", () => this.OP_TAX());
        this.OP(0xAC, "LDY_ABS", () => this.OP_LDY_ABS());
        this.OP(0xAD, "LDA_ABS", () => this.OP_LDA_ABS());
        this.OP(0xAE, "LDX_ABS", () => this.OP_LDX_ABS());    
        this.OP(0xB1, "LDA_INDY", () => this.OP_LDA_INDY());
        this.OP(0xB4, "LDY_ZPX", () => this.OP_LDY_ZPX());
        this.OP(0xB5, "LDA_ZPX", () => this.OP_LDA_ZPX());        
        this.OP(0xB6, "LDX_ZPY", () => this.OP_LDX_ZPY());
        this.OP(0xB8, "CLV", () => this.OP_CLV());
        this.OP(0xB9, "LDA_ABSY", () => this.OP_LDA_ABSY());
        this.OP(0xBA, "TSX", () => this.OP_TSX());
        this.OP(0xBC, "LDY_ABSX", () => this.OP_LDY_ABSX());
        this.OP(0xBD, "LDA_ABSX", () => this.OP_LDA_ABSX());
        this.OP(0xBE, "LDX_ABSY", () => this.OP_LDX_ABSY());
        this.OP(0xD0, "BNE", () => this.OP_BNE());
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
