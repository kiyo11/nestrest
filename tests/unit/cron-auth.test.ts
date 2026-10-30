import { afterEach, describe, expect, it, vi } from "vitest";
import { isCronAuthorized } from "../../src/lib/cron-auth";

function req(auth?: string): Request {
  return new Request("http://local/api/cron", {
    headers: auth ? { authorization: auth } : {},
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isCronAuthorized", () => {
  it("accepts a matching bearer token", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(isCronAuthorized(req("Bearer s3cret"))).toBe(true);
  });

  it("rejects a wrong token", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(isCronAuthorized(req("Bearer nope"))).toBe(false);
  });

  it("fails CLOSED in production when the secret is unset", () => {
    vi.stubEnv("CRON_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(isCronAuthorized(req())).toBe(false);
  });

  it("allows the open dev path in non-production when the secret is unset", () => {
    vi.stubEnv("CRON_SECRET", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(isCronAuthorized(req())).toBe(true);
  });
});
