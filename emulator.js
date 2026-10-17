import {Memory} from './memory.js';
import {CPU6502} from './cpu6502.js';
import {DOMPrinter} from './dom-printer.js';

export class Emulator {
    constructor() {
        this.domPrinter = new DOMPrinter();;
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
