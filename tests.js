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
            this.log(`LDA IMM failed! expected 0x42, output 0x${this.emu.cpu.A.toString(16)}`);
        }
    }

    TEST_LDA_ZP() {
        this.emu = new Emulator(); 
        this.emu.memory.writeb(0x0010, 0x99);

        this.emu.loadProgram(0x8000, [0xA5, 0x10, 0x00]);
        this.emu.cpu.cpuInit();
        this.emu.cpu.cpuStep();

        if (this.emu.cpu.A === 0x99) {
            this.log("LDA ZP passed!");
        } else {
            this.log(`LDA ZP failed! expected 0x99, output 0x${this.emu.cpu.A.toString(16)}`);
        }
    }

    run() {
        this.TEST_LDA_IMM();
        this.TEST_LDA_ZP();
    }
}

const tester = new Test();
tester.run();
