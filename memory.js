export class Memory {
    constructor(ppu) {
        this.ram = new Uint8Array(0x800);
        this.ppu = ppu;
        this.prg = new Uint8Array(0x8000);
    }

    readb(addr) {
        addr &= 0xFFFF;
        const block = addr >> 13;

        switch (block) {
            case 0: // 0x0000-0x1FFF: RAM + mirrors
                return this.ram[addr & 0x07FF];
            case 1: // 0x2000-0x3FFF: PPU regs
                return 0; // ppu stub
            default: // 0x4000-0xFFFF
                if (addr < 0x8000) return 0;
                return this.prg[addr - 0x8000];
        }
    }

    writeb(addr, data) {
        addr &= 0xFFFF;
        data &= 0xFF;

        if (addr === 0x4014) {
            const base = data << 8;
            for (let i=0; i<256; i++) {
                // ppu writeOAM stub
            }
            return;
        }

        const block = addr >> 13;
        switch (block) {
            case 0:
                this.ram[addr & 0x07FF] = data;
                break;
            case 1:
                // ppu stub
                break;
            default:
                if (addr < 0x8000) return;
                this.prg[addr - 0x8000] = data;
                break; 
        }
    }

    readw(addr) {
        return this.readb(addr) | (this.readb(addr + 1) << 8);
    }

    writew(addr, data) {
        this.writeb(addr, data & 0xFF);
        this.writeb(addr + 1, data >> 8);
    }
}
