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

        // Cycle counter
        this.cycles = 0;
    }
}
