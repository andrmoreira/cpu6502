export class DOMPrinter {
    constructor(containerElement = document.body) {
        this.container = containerElement;
    }

    log(message) {
        const p = document.createElement('p');
        p.textContent = message;
        this.container.appendChild(p);
    }
}
