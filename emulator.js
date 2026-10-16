import {Memory} from './memory.js';
import {CPU6502} from './cpu6502.js';

export class Emulator {
    constructor() {
        this.memory = new Memory(null);
        this.cpu = new CPU6502(this.memory);
    }

    log(message) {
        const p = document.createElement('p');
        p.textContent = message;
        document.body.appendChild(p);
    }

    run() {
        this.memory.writew(0xFFFC, 0x8000);

        this.memory.writeb(0x8000, 0xA9);
        this.memory.writeb(0x8001, 0x42);
        this.memory.writeb(0x8002, 0x00);

        this.cpu.cpuInit();
        this.log(`Start PC: 0x${this.cpu.PC.toString(16)}`);

        this.cpu.cpuStep();
        this.log(`A: 0x${this.cpu.A.toString(16)}`);
        this.log(`PC: 0x${this.cpu.PC.toString(16)}`);

        this.cpu.cpuStep();
        this.log(`Cycles: ${this.cpu.cycles}`);
    }
}

const emu = new Emulator();
emu.run();
