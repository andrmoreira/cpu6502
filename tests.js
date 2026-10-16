import {Emulator} from './emulator.js';

class Test {
    constructor() {
        this.emu = new Emulator();
    }

    log(message) {
        const p = document.createElement('p');
        p.textContent = message;
        document.body.appendChild(p);
    }

    // tests

    TEST_LDA_IMM() {
        this.emu.loadProgram(0x8000, [0xA9, 0x42, 0x00]);
        this.emu.cpu.cpuInit();
        this.emu.cpu.cpuStep();

        if (this.emu.cpu.A === 0x42) {
            this.log("LDA IMM passed!");
        } else {
            this.log(`LDA IMM failed! expected 0x42, output 0x${this.emulator.cpu.A.toString(16)}`);
        }
    }

    run() {
        this.TEST_LDA_IMM();
    }
}

const tester = new Test();
tester.run();
