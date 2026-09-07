export function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}
export function optionalEnv(name) {
    return process.env[name];
}
//# sourceMappingURL=env.js.map