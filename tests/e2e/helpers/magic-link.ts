import { readFileSync } from "node:fs";
import { expect } from "@playwright/test";

const LOG = ".playwright/dev.log";

// The dev magic-link transport prints `[auth:magic-link] <email>\n  <url>`.
// Poll the dev-server log for the most recent link addressed to `email`.
export async function waitForMagicLink(email: string, sinceOffset = 0): Promise<string> {
  let url: string | null = null;
  await expect
    .poll(
      () => {
        let text = "";
        try {
          text = readFileSync(LOG, "utf8").slice(sinceOffset);
        } catch {
          return false;
        }
        const re = new RegExp(`\\[auth:magic-link\\]\\s+${email.replace(/[.+]/g, "\\$&")}\\s+(\\S+)`, "g");
        let m: RegExpExecArray | null;
        let last: string | null = null;
        while ((m = re.exec(text))) last = m[1];
        if (last) {
          url = last;
          return true;
        }
        return false;
      },
      { timeout: 30_000, intervals: [500] },
    )
    .toBe(true);
  return url!;
}

export function logSize(): number {
  try {
    return readFileSync(LOG, "utf8").length;
  } catch {
    return 0;
  }
}
