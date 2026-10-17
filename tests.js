import {Emulator} from './emulator.js';
import {DOMPrinter} from './dom-printer.js';

class Test {
    constructor() {
        this.domPrinter = new DOMPrinter();
        this.emu = new Emulator(this.domPrinter);
    }

    // tests

    TEST_LDA_IMM() {
        this.emu = new Emulator(this.domPrinter);
        this.emu.loadProgram(0x8000, [0xA9, 0x42, 0x00]);
        this.emu.cpu.cpuInit();
        this.emu.cpu.cpuStep();

        if (this.emu.cpu.A === 0x42) {
            this.domPrinter.log("LDA IMM passed!");
        } else {
            this.domPrinter.log(`LDA IMM failed! expected 0x42, output 0x${this.emu.cpu.A.toString(16)}`);
        }
    }

    TEST_LDA_ZP() {
        this.emu = new Emulator(this.domPrinter); 
        this.emu.memory.writeb(0x0010, 0x99);

        this.emu.loadProgram(0x8000, [0xA5, 0x10, 0x00]);
        this.emu.cpu.cpuInit();
        this.emu.cpu.cpuStep();

        if (this.emu.cpu.A === 0x99) {
            this.domPrinter.log("LDA ZP passed!");
        } else {
            this.domPrinter.log(`LDA ZP failed! expected 0x99, output 0x${this.emu.cpu.A.toString(16)}`);
        }
    }

    TEST_LDA_ZPX() {
        this.emu = new Emulator(this.domPrinter); 
        this.emu.loadProgram(0x8000, [0xB5, 0x10, 0x00]);
        this.emu.cpu.cpuInit();

        this.emu.cpu.X = 0x05;
        this.emu.memory.writeb(0x15, 0x77);
        this.emu.cpu.cpuStep();

        if (this.emu.cpu.A === 0x77) {
            this.domPrinter.log("LDA ZP,X passed!");
        } else {
            this.domPrinter.log(`LDA ZP,X failed! expected 0x77, output 0x${this.emu.cpu.A.toString(16)}`);
        }
    }

    TEST_LDX_ZPY() {
        this.emu = new Emulator(this.domPrinter); 
        this.emu.loadProgram(0x8000, [0xB6, 0x10, 0x00]);
        this.emu.cpu.cpuInit();

        this.emu.cpu.Y = 0x03;
        this.emu.memory.writeb(0x13, 0x55);
        this.emu.cpu.cpuStep();

        if (this.emu.cpu.X === 0x55) {
            this.domPrinter.log("LDX ZP,Y passed!");
        } else {
            this.domPrinter.log(`LDX ZP,Y failed! expected 0x55, output 0x${this.emu.cpu.X.toString(16)}`);
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
