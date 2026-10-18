import {Memory} from './memory.js';
import {CPU6502} from './cpu.js';

export class Emulator {
    constructor() {
        this.memory = new Memory(null);
        this.cpu = new CPU6502(this.memory);
    }
}
