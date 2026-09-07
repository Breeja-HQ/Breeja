export class BreejaError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(message);
        this.name = "BreejaError";
        this.code = code;
        this.details = details;
    }
}
//# sourceMappingURL=types.js.map