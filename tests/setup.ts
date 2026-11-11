import { webcrypto } from "node:crypto";

// Node >= 20 exposes a WebCrypto implementation compatible with the browser
// API. Reuse it so tests exercise the same subtle-encrypt code path.
if (!globalThis.crypto || !globalThis.crypto.subtle) {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true,
  });
}

if (typeof globalThis.window === "undefined") {
  Object.defineProperty(globalThis, "window", {
    value: globalThis,
    configurable: true,
  });
}

if (typeof globalThis.TextEncoder === "undefined") {
  globalThis.TextEncoder = require("node:util").TextEncoder;
}
if (typeof globalThis.TextDecoder === "undefined") {
  globalThis.TextDecoder = require("node:util").TextDecoder;
}
