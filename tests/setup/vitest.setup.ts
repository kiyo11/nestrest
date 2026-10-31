import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// A deterministic 32-byte base64 key so crypto round-trip tests are stable.
process.env.ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY ?? Buffer.alloc(32, 7).toString("base64");

afterEach(() => {
  cleanup();
});
