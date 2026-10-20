import {Memory} from './memory.js';
import {CPU6502} from './cpu.js';

export class Emulator {
    constructor() {
        this.memory = new Memory(null);
        this.cpu = new CPU6502(this.memory);
    }

    runHexSequence(hexString) {
        const bytes = hexString.trim() ? hexString.trim().split(/\s+/).map(b => parseInt(b, 16)) : [];

        this.memory.ram.fill(0);
        this.memory.prg.fill(0);

        this.memory.writeb(0xFFFC, 0x00);
        this.memory.writeb(0xFFFD, 0x80);

        bytes.forEach((byte, index) => {
            this.memory.writeb(0x8000 + index, byte);
        });

        this.cpu.cpuReset();
        let safety = 100;
        while (safety-- > 0) {
            const opPC = this.cpu.PC;
            if (this.memory.readb(opPC) === 0x00) break;
            this.cpu.cpuStep();
        }
        
        return `A: 0x${this.cpu.A.toString(16).padStart(2, '0').toUpperCase()} | ` +
               `X: 0x${this.cpu.X.toString(16).padStart(2, '0').toUpperCase()} | ` +
               `Y: 0x${this.cpu.Y.toString(16).padStart(2, '0').toUpperCase()} | ` +
               `PC: 0x${this.cpu.PC.toString(16).padStart(4, '0').toUpperCase()} | ` +
               `C: ${this.cpu.C} | Z: ${this.cpu.Z} | N: ${this.cpu.N} | ` +
               `Cycles: ${this.cpu.cycles}`;
    }
}
