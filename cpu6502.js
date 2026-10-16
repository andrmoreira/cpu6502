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
        this.C = 0; this.Z = 0; this.I = 1;
        this.D = 0; this.B = 0; this.V = 0; this.N = 0;

        this.cycles = 0;
        this.initTable();
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

    // 0xA9: LDA Immediate
    OP_LDA_IMM() {
        const addr = this.modeIMM();
        this.A = this.mem.readb(addr);
        this.Z = this.A === 0?1:0;
        this.N = (this.A & 0x80)?1:0;
        return 2;
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

        this.table[0xA9] = {
            name: "LDA_IMM",
            exec: () => this.OP_LDA_IMM()
        };
    }


    // --- CPU Control ---

    cpuInit() {
        console.log("CPU6502 initialized");
        this.cpuReset();
    }

    cpuReset() {
        this.PC = this.mem.readw(0xFFFC);
    }

    cpuStep() {
        const op = this.mem.readb(this.PC++);
        const instruction = this.table[op];
        const cyclesSpent = instruction.exec();
        this.cycles += cyclesSpent;
        return cyclesSpent;
    }
}
