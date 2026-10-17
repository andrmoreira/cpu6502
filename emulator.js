import {Memory} from './memory.js';
import {CPU6502} from './cpu6502.js';

export class Emulator {
    constructor(domPrinter) {
        this.domPrinter = domPrinter;
        this.memory = new Memory(null);
        this.cpu = new CPU6502(this.memory, this.domPrinter);
    }

    loadProgram(address, bytes) {
        bytes.forEach((b, index) => {
            this.memory.writeb(address + index, b);
        });
        this.memory.writew(0xFFFC, address);
    }
}
