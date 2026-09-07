import { cpSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(__dirname, "x402-stubs");

// @coinbase/cdp-sdk (a transitive dep of RainbowKit's wagmi connectors) can
// be hoisted to either frontend/node_modules or the npm workspace root's
// node_modules depending on what else is installed — Node resolves its
// @x402/* imports from wherever cdp-sdk itself landed, so the stub needs to
// exist in both places to survive either hoisting outcome.
const targets = [
  path.join(__dirname, "..", "node_modules", "@x402"),
  path.join(__dirname, "..", "..", "node_modules", "@x402"),
];

for (const target of targets) {
  const parent = path.dirname(target);
  if (!existsSync(parent)) continue;
  if (!existsSync(target)) {
    mkdirSync(target, { recursive: true });
  }
  cpSync(source, target, { recursive: true });
}

console.log("Installed @x402 stub packages (workaround for @coinbase/cdp-sdk's unpublished @x402/* dependencies).");
