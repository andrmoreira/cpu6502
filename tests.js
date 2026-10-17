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

    TEST_LDA_ZPX() {
        this.emu = new Emulator(); 
        
        this.emu.loadProgram(0x8000, [0xB5, 0x10, 0x00]);
        this.emu.cpu.cpuInit();

        this.emu.cpu.X = 0x05;
        this.emu.memory.writeb(0x15, 0x77);

        this.emu.cpu.cpuStep();

        if (this.emu.cpu.A === 0x77) {
            this.log("LDA ZP,X passed!");
        } else {
            this.log(`LDA ZP,X failed! expected 0x77, output 0x${this.emu.cpu.A.toString(16)}`);
        }
    }

    TEST_LDX_ZPY() {
        this.emu = new Emulator(); 
        
        this.emu.loadProgram(0x8000, [0xB6, 0x10, 0x00]);
        this.emu.cpu.cpuInit();

        this.emu.cpu.Y = 0x03;
        this.emu.memory.writeb(0x13, 0x55);
        
        this.emu.cpu.cpuStep();

        if (this.emu.cpu.X === 0x55) {
            this.log("LDX ZP,Y passed!");
        } else {
            this.log(`LDX ZP,Y failed! expected 0x55, output 0x${this.emu.cpu.X.toString(16)}`);
        }
    }

    run() {
        this.TEST_LDA_IMM();
        this.TEST_LDA_ZP();
        this.TEST_LDA_ZPX();
        this.TEST_LDX_ZPY();
    }
}

const tester = new Test();
tester.run();
