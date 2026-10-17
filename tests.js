import {Emulator} from './emulator.js';
import {DOMPrinter} from './dom-printer.js';

class Test {
    constructor() {
        this.domPrinter = new DOMPrinter();
        this.emu = new Emulator(this.domPrinter);
    }

    // tests

    TEST_BRK() {
        this.emu = new Emulator(this.domPrinter);
        this.emu.loadProgram(0x8000, [0x00]);
        this.emu.cpu.cpuInit();
        
        this.emu.memory.writeb(0xFFFC, 0x00);
        this.emu.memory.writeb(0xFFFD, 0x80);

        this.emu.memory.writeb(0xFFFE, 0x00);
        this.emu.memory.writeb(0xFFFF, 0x90);

        const initialSP = this.emu.cpu.SP;
        this.emu.cpu.cpuStep();

        const pcPassed = this.emu.cpu.PC === 0x9000;
        const interruptPassed = this.emu.cpu.I === 1;
        const spPassed = this.emu.cpu.SP === ((initialSP - 3) & 0xFF);

        if (pcPassed && interruptPassed && spPassed) {
            this.domPrinter.log("BRK passed!");
        } else {
            this.domPrinter.log(`BRK failed! PC: 0x${this.emu.cpu.PC.toString(16)}, I: ${this.emu.cpu.I}, SP: 0x${this.emu.cpu.SP.toString(16)}`);
        }
    }
    
    TEST_LDA_INDX() {
        this.emu = new Emulator(this.domPrinter);
        this.emu.loadProgram(0x8000, [0xA1, 0x20, 0x00]);
        this.emu.cpu.cpuInit();
        
        this.emu.cpu.X = 0x02;
        this.emu.memory.writeb(0x22, 0x34);
        this.emu.memory.writeb(0x23, 0x12);
        
        this.emu.memory.writeb(0x1234, 0xAA);
        this.emu.cpu.cpuStep();

        if (this.emu.cpu.A === 0xAA) {
            this.domPrinter.log("LDA (Indirect, X) passed!");
        } else {
            this.domPrinter.log(`LDA (Indirect, X) failed! expected 0xAA, output 0x${this.emu.cpu.A.toString(16)}`);
        }
    }
    
    TEST_LDX_IMM() {
        this.emu = new Emulator(this.domPrinter);
        this.emu.loadProgram(0x8000, [0xA2, 0x50, 0x00]);
        this.emu.cpu.cpuInit();
        this.emu.cpu.cpuStep();

        if (this.emu.cpu.X === 0x50) {
            this.domPrinter.log("LDX IMM passed!");
        } else {
            this.domPrinter.log(`LDX IMM failed! expected 0x50, output 0x${this.emu.cpu.X.toString(16)}`);
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
    
    TEST_LDA_ABS() {
        this.emu = new Emulator(this.domPrinter);
        this.emu.loadProgram(0x8000, [0xAD, 0x00, 0x02]);
        this.emu.cpu.cpuInit();

        this.emu.memory.writeb(0x0200, 0x88);
        this.emu.cpu.cpuStep();

        if (this.emu.cpu.A === 0x88) {
            this.domPrinter.log("LDA Absolute passed!");
        } else {
            this.domPrinter.log(`LDA Absolute failed! expected 0x88, output 0x${this.emu.cpu.A.toString(16)}`);
        }
    }
    
    TEST_LDA_INDY() {
        this.emu = new Emulator(this.domPrinter);
        this.emu.loadProgram(0x8000, [0xB1, 0x40, 0x00]);
        this.emu.cpu.cpuInit();
        
        this.emu.memory.writeb(0x40, 0x00);
        this.emu.memory.writeb(0x41, 0x02);
        this.emu.cpu.Y = 0x05;
        
        this.emu.memory.writeb(0x0205, 0xBB);
        this.emu.cpu.cpuStep();

        if (this.emu.cpu.A === 0xBB) {
            this.domPrinter.log("LDA (Indirect), Y passed!");
        } else {
            this.domPrinter.log(`LDA (Indirect), Y failed! expected 0xBB, output 0x${this.emu.cpu.A.toString(16)}`);
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

    TEST_LDA_ABSY() {
        this.emu = new Emulator(this.domPrinter);
        this.emu.loadProgram(0x8000, [0xB9, 0x00, 0x02]);
        this.emu.cpu.cpuInit();

        this.emu.cpu.Y = 0x05;
        this.emu.memory.writeb(0x0205, 0xDD);
        this.emu.cpu.cpuStep();

        if (this.emu.cpu.A === 0xDD) {
            this.domPrinter.log("LDA Absolute,Y passed!");
        } else {
            this.domPrinter.log(`LDA Absolute,Y failed! expected 0xDD, output 0x${this.emu.cpu.A.toString(16)}`);
        }
    }
    
    TEST_LDA_ABSX() {
        this.emu = new Emulator(this.domPrinter);
        this.emu.loadProgram(0x8000, [0xBD, 0x00, 0x02]);
        this.emu.cpu.cpuInit();

        this.emu.cpu.X = 0x0A;
        this.emu.memory.writeb(0x020A, 0xCC);
        this.emu.cpu.cpuStep();

        if (this.emu.cpu.A === 0xCC) {
            this.domPrinter.log("LDA Absolute,X passed!");
        } else {
            this.domPrinter.log(`LDA Absolute,X failed! expected 0xCC, output 0x${this.emu.cpu.A.toString(16)}`);
        }
    }

    run() {
        // 0x00
        this.TEST_BRK();
        // 0xA1
        this.TEST_LDA_INDX();
        // 0xA2
        this.TEST_LDX_IMM();
        // 0xA5
        this.TEST_LDA_ZP();
        // 0xA9
        this.TEST_LDA_IMM();
        // 0xAD
        this.TEST_LDA_ABS();
        // 0xB1
        this.TEST_LDA_INDY();
        // 0xB5
        this.TEST_LDA_ZPX();
        // 0xB6
        this.TEST_LDX_ZPY();
        // 0xB9
        this.TEST_LDA_ABSY();
        // 0xBD
        this.TEST_LDA_ABSX();
    }
}

const tester = new Test();
tester.run();
