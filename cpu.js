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
        this.extraCycles = 0;
        
        this.initTable();
        this.cpuInit();
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
        const finalAddr = (base + this.Y) & 0xFFFF;
        if (hi !== (finalAddr >> 8))
            this.extraCycles=1;
        return finalAddr;
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
        const finalAddr = (base + this.X) & 0xFFFF;
        if (hi !== (finalAddr >> 8))
            this.extraCycles=1;
        return finalAddr;
    }
    // Absolute, Y
    modeABSY() {
        const lo = this.mem.readb(this.PC);
        const hi = this.mem.readb(this.PC+1);
        this.PC += 2;
        const base = (hi << 8) | lo;
        const finalAddr = (base + this.Y) & 0xFFFF;
        if (hi !== (finalAddr >> 8))
            this.extraCycles=1;
        return finalAddr;
    }
    // Relative
    modeREL() {
        const offset = this.mem.readb(this.PC);
        this.PC++;
        if (offset & 0x80) offset |= 0xFF00; // Sign extend
        return offset;
    }


    // --- Base Instructions ---
    
    lda(addr) {
        // loads a value in a, sets Z and N
        this.A = this.mem.readb(addr);
        this.updateZN(this.A);
    }
    ldx(addr) {
        // loads x value in x, sets Z and N
        this.X = this.mem.readb(addr);
        this.updateZN(this.X);
    }
    ldy(addr) {
        // loads a value in y, sets Z and N
        this.Y = this.mem.readb(addr);
        this.updateZN(this.Y);
    }
    eor(addr) {
        // XORs A with the value, set Z and N
        this.A ^= this.mem.readb(addr);
        this.updateZN(this.A);
    }
    ora(addr) {
        // ORs A with the value, set Z and N
        this.A |= this.mem.readb(addr);
        this.updateZN(this.A);
    }
    and(addr) {
        // ANDs A with the value, sets Z and N
        this.A &= this.mem.readb(addr);
        this.updateZN(this.A);
    }
    sta(addr) {
        // stores a to a memory location
        this.mem.writeb(addr, this.A);
    }
    stx(addr) {
        // stores x to x memory location
        this.mem.writeb(addr, this.X);
    }
    sty(addr) {
        // stores y to y memory location
        this.mem.writeb(addr, this.Y);
    }
    cmp(addr) {
        // sets C, Z and N according to what A - value would do
        const val = this.mem.readb(addr);
        const result = (this.A - val) & 0xFF;
        this.C = (this.A >= val)?1:0;
        this.updateZN(result);
    }
    cpx(addr) {
        // sets C, Z and N according to what X - value would do
        const val = this.mem.readb(addr);
        const result = (this.X - val) & 0xFF;
        this.C = (this.X >= val)?1:0;
        this.updateZN(result);
    }
    cpy(addr) {
        // sets C, Z and N according to what Y - value would do
        const val = this.mem.readb(addr);
        const result = (this.Y - val) & 0xFF;
        this.C = (this.Y >= val)?1:0;
        this.updateZN(result);
    }
    adc(addr) {
        // Adds the value + C to A, sets C, V, Z and N
        const val = this.mem.readb(addr);
        const sum = this.A + val + this.C;
        this.C = (sum > 0xFF)?1:0;
        // Set overflow flag if result sign differs from both inputs due to signed overflow
        this.V = (~(this.A ^ val) & (this.A ^ sum) & 0x80) & 0xFFFF;
        this.A = sum & 0xFF;
        this.updateZN(this.A);
    }
    sbc(addr) {
        // subtracts the value + !C from A, set C, V, Z and N
        const val = this.mem.readb(addr);
        const result = this.A - val - (1 - this.C);
        this.C = (result >= 0)?1:0;
        // Set overflow flag if signed overflow occurs during subtraction
        this.V = ((this.A ^ val) & (this.A ^ result) & 0x80)?1:0;
        this.A = result & 0xFF;
        this.updateZN(this.A);
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
    // 0x0A: ASL Accumulator
    OP_ASL_ACC() {
        // shifts A left 1, set C, Z and N
        this.modeIMP();
        this.C = (this.A & 0x80)?1:0;
        this.A = (this.A << 1) & 0xFF;
        this.updateZN(this.A);
        return 2;
    }
    // 0x18: CLC
    OP_CLC() {
        // clear carry flag
        this.modeIMP();
        this.C=0;
        return 2;
    }
    // 0x38: SEC
    OP_SEC() {
        // set carry flag
        this.modeIMP();
        this.C=1;
        return 2;
    }
    // 0x4C: JMP Absolute
    OP_JMP_ABS() {
        // jump to address
        this.PC = this.modeABS();
        return 3;
    }
    // 0x8A: TXA
    OP_TXA() {
        // transfers x to a, sets Z and N
        this.modeIMP();
        this.A = this.X;
        this.updateZN(this.A);
        return 2;
    }
    // 0xA8 TAY
    OP_TAY() {
        // transfers a to y, sets Z and N
        this.modeIMP();
        this.Y = this.A;
        this.updateZN(this.Y);
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
    
    // 0xB8: CLV
    OP_CLV() {
        // clear overflow flag
        this.modeIMP();
        this.V=0;
        return 2;
    }
    // 0xBA: TSX
    OP_TSX() {
        // transfers the stack pointer to x, sets Z and N
        this.modeIMP();
        this.X = this.SP;
        this.updateZN(this.X);
        return 2;
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
    // 0xEA: NOP
    OP_NOP() {
        // No Operation
        return 2;
    }


    // --- Opcode Table ---
    
    initTable() {
        this.table = new Array(256);

        for (let i=0; i<256; i++) {
            this.table[i] = {
                name: "unknown",
                cycles: 2,
                exec: (op=i) => this.OP_UNKNOWN(op)
            };
        }
        
        const op = (code, name, cycles, modeFn, instFn) => {
            this.table[code] = {
                name,
                exec: () => {
                    this.extraCycles=0;
                    // Exec with addressing mode
                    if (instFn) {
                        const addr = modeFn.call(this);
                        instFn.call(this, addr);
                        return cycles + this.extraCycles;
                    } else {
                        // Exec direct
                        return modeFn.call(this);
                    }
                }
            };
        }
        
        // --- Other Instructions ---
        op(0x00, "BRK", 7, () => this.OP_BRK());
        op(0x06, "ASL_ZP", 5, () => this.OP_ASL_ZP());
        op(0x08, "PHP", 3, () => this.OP_PHP());
        op(0x0A, "ASL_ACC", 2, () => this.OP_ASL_ACC());
        op(0x18, "CLC", 2, () => this.OP_CLC());
        op(0x38, "SEC", 2, () => this.OP_SEC());
        op(0x4C, "JMP_ABS", 3, () => this.OP_JMP_ABS());
        op(0x8A, "TXA", 2, () => this.OP_TXA());
        op(0xA8, "TAY", 2, () => this.OP_TAY());
        op(0xAA, "TAX", 2, () => this.OP_TAX());
        op(0xB8, "CLV", 2, () => this.OP_CLV());
        op(0xBA, "TSX", 2, () => this.OP_TSX());
        op(0xD0, "BNE", 2, () => this.OP_BNE());
        op(0xEA, "NOP", 2, () => this.OP_NOP());
        // --- LDA Instructions ---
        op(0xA9, "LDA_IMM", 2, this.modeIMM, this.lda);
        op(0xA5, "LDA_ZP", 3, this.modeZP, this.lda);
        op(0xB5, "LDA_ZPX", 4, this.modeZPX, this.lda);
        op(0xAD, "LDA_ABS", 4, this.modeABS, this.lda);
        op(0xBD, "LDA_ABSX", 4, this.modeABSX, this.lda);
        op(0xB9, "LDA_ABSY", 4, this.modeABSY, this.lda);
        op(0xA1, "LDA_INDX", 6, this.modeINDX, this.lda);
        op(0xB1, "LDA_INDY", 5, this.modeINDY, this.lda);
        // --- LDX Instructions ---
        op(0xA2, "LDX_IMM", 2, this.modeIMM, this.ldx);
        op(0xA6, "LDX_ZP", 3, this.modeZP, this.ldx);
        op(0xB6, "LDX_ZPY", 4, this.modeZPY, this.ldx);
        op(0xAE, "LDX_ABS", 4, this.modeABS, this.ldx);
        op(0xBE, "LDX_ABSY", 4, this.modeABSY, this.ldx);
        // --- LDY Instructions ---
        op(0xA0, "LDY_IMM", 2, this.modeIMM, this.ldy);
        op(0xA4, "LDY_ZP", 3, this.modeZP, this.ldy);
        op(0xB4, "LDY_ZPX", 4, this.modeZPX, this.ldy);
        op(0xAC, "LDY_ABS", 4, this.modeABS, this.ldy);
        op(0xBC, "LDY_ABSX", 4, this.modeABSX, this.ldy);
        // --- EOR Instructions ---
        op(0x41, "EOR_INDX", 6, this.modeINDX, this.eor);
        op(0x45, "EOR_ZP", 3, this.modeZP, this.eor);
        op(0x49, "EOR_IMM", 2, this.modeIMM, this.eor);
        op(0x4D, "EOR_ABS", 4, this.modeABS, this.eor);
        op(0x51, "EOR_INDY", 5, this.modeINDY, this.eor);
        op(0x55, "EOR_ZPX", 4, this.modeZPX, this.eor);
        op(0x59, "EOR_ABSY", 4, this.modeABSY, this.eor);
        op(0x5D, "EOR_ABSX", 4, this.modeABSX, this.eor);
        // --- ORA Instructions ---
        op(0x09, "ORA_IMM", 2, this.modeIMM, this.ora);
        op(0x05, "ORA_ZP", 3, this.modeZP, this.ora);
        op(0x0D, "ORA_ABS", 4, this.modeABS, this.ora);
        op(0x01, "ORA_INDX", 6, this.modeINDX, this.ora);
        op(0x11, "ORA_INDY", 5, this.modeINDY, this.ora);
        op(0x15, "ORA_ZPX", 4, this.modeZPX, this.ora);
        op(0x19, "ORA_ABSY", 4, this.modeABSY, this.ora);
        op(0x1D, "ORA_ABSX", 4, this.modeABSX, this.ora);
        // --- STA Instructions ---
        op(0x81, "STA_INDX", 6, this.modeINDX, this.sta);
        op(0x91, "STA_INDY", 5, this.modeINDY, this.sta);
        op(0x85, "STA_ZP", 3, this.modeZP, this.sta);
        op(0x95, "STA_ZPX", 4, this.modeZPX, this.sta);
        op(0x8D, "STA_ABS", 4, this.modeABS, this.sta);
        op(0x9D, "STA_ABSX", 5, this.modeABSX, this.sta);
        op(0x99, "STA_ABSY", 5, this.modeABSY, this.sta);
        // --- STX Instructions ---
        op(0x86, "STX_ZP", 3, this.modeZP, this.stx);
        op(0x96, "STX_ZPX", 4, this.modeZPX, this.stx);
        op(0x8E, "STX_ABS", 4, this.modeABS, this.stx);
        // --- STY Instructions ---
        op(0x84, "STY_ZP", 3, this.modeZP, this.sty);
        op(0x94, "STY_ZPX", 4, this.modeZPX, this.sty);
        op(0x8C, "STY_ABS", 4, this.modeABS, this.sty);
        // --- CMP Instructions ---
        op(0xC9, "CMP_IMM", 2, this.modeIMM, this.cmp);
        op(0xC5, "CMP_ZP", 3, this.modeZP, this.cmp);
        op(0xD5, "CMP_ZPX", 4, this.modeZPX, this.cmp);
        op(0xCD, "CMP_ABS", 4, this.modeABS, this.cmp);
        op(0xDD, "CMP_ABSX", 4, this.modeABSX, this.cmp);
        op(0xD9, "CMP_ABSY", 4, this.modeABSY, this.cmp);
        op(0xC1, "CMP_INDX", 6, this.modeINDX, this.cmp);
        op(0xD1, "CMP_INDY", 5, this.modeINDY, this.cmp);
        // --- CPX Instructions ---
        op(0xE0, "CPX_IMM", 2, this.modeIMM, this.cpx);
        op(0xE4, "CPX_ZP", 3, this.modeZP, this.cpx);
        op(0xEC, "CPX_ABS", 4, this.modeABS, this.cpx);
        // --- CPY Instructions ---
        op(0xC0, "CPY_IMM", 2, this.modeIMM, this.cpy);
        op(0xC4, "CPY_ZP", 3, this.modeZP, this.cpy);
        op(0xCC, "CPY_ABS", 4, this.modeABS, this.cpy);
        // --- ADC Instructions ---
        op(0x69, "ADC_IMM", 2, this.modeIMM, this.adc);
        op(0x65, "ADC_ZP", 3, this.modeZP, this.adc);
        op(0x75, "ADC_ZPX", 4, this.modeZPX, this.adc);
        op(0x6D, "ADC_ABS", 4, this.modeABS, this.adc);
        op(0x79, "ADC_ABSX", 4, this.modeABSX, this.adc);
        op(0x7D, "ADC_ABSY", 4, this.modeABSY, this.adc);
        op(0x61, "ADC_INDX", 6, this.modeINDX, this.adc);
        op(0x71, "ADC_INDY", 5, this.modeINDY, this.adc);
        // --- SBC Instructions ---
        op(0xE9, "SBC_IMM", 2, this.modeIMM, this.sbc);
        op(0xE5, "SBC_ZP", 3, this.modeZP, this.sbc);
        op(0xF5, "SBC_ZPX", 4, this.modeZPX, this.sbc);
        op(0xED, "SBC_ABS", 4, this.modeABS, this.sbc);
        op(0xFD, "SBC_ABSX", 4, this.modeABSX, this.sbc);
        op(0xF9, "SBC_ABSY", 4, this.modeABSY, this.sbc);
        op(0xE1, "SBC_INDX", 6, this.modeINDX, this.sbc);
        op(0xF1, "SBC_INDY", 5, this.modeINDY, this.sbc);
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
