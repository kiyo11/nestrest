import { describe, it, expect } from "vitest";
import { renderTemplate, fmtDate, MERGE_FIELDS } from "@/lib/merge";

describe("renderTemplate merge engine", () => {
  const full = {
    guest_first_name: "Ada",
    checkin_date: "Mon, Jan 1",
    checkout_date: "Fri, Jan 5",
    door_code: "4821",
    wifi: "NestRest / hunter2",
  };

  it("resolves every known merge field", () => {
    const { text, missing } = renderTemplate(
      "Hi {{guest_first_name}}, check in {{checkin_date}}, code {{door_code}}, wifi {{wifi}}",
      full,
    );
    expect(text).toBe("Hi Ada, check in Mon, Jan 1, code 4821, wifi NestRest / hunter2");
    expect(missing).toEqual([]);
  });

  it("tolerates whitespace inside the token braces", () => {
    const { text, missing } = renderTemplate("Hi {{  guest_first_name  }}", full);
    expect(text).toBe("Hi Ada");
    expect(missing).toEqual([]);
  });

  it("collects a missing field and leaves the token visible", () => {
    const { text, missing } = renderTemplate("Code is {{door_code}}", {
      ...full,
      door_code: null,
    });
    expect(missing).toEqual(["door_code"]);
    expect(text).toContain("{{door_code}}");
  });

  it("treats empty string as missing", () => {
    const { missing } = renderTemplate("{{wifi}}", { ...full, wifi: "" });
    expect(missing).toEqual(["wifi"]);
  });

  it("de-duplicates a field referenced twice", () => {
    const { missing } = renderTemplate("{{door_code}} {{door_code}}", {
      ...full,
      door_code: null,
    });
    expect(missing).toEqual(["door_code"]);
  });

  it("reports multiple distinct missing fields", () => {
    const { missing } = renderTemplate("{{door_code}} {{wifi}}", {
      ...full,
      door_code: null,
      wifi: null,
    });
    expect(missing.sort()).toEqual(["door_code", "wifi"]);
  });

  it("leaves unknown tokens untouched and does not flag them as missing", () => {
    const { text, missing } = renderTemplate("Hello {{unknown_field}}", full);
    expect(text).toBe("Hello {{unknown_field}}");
    expect(missing).toEqual([]);
  });

  it("exposes the canonical merge field list", () => {
    expect(MERGE_FIELDS).toEqual([
      "guest_first_name",
      "checkin_date",
      "checkout_date",
      "door_code",
      "wifi",
    ]);
  });
});

describe("fmtDate", () => {
  it("formats a date in the given IANA timezone", () => {
    // 2025-01-01T06:00:00Z is still Dec 31 in Los Angeles.
    const d = new Date("2025-01-01T06:00:00Z");
    expect(fmtDate(d, "America/Los_Angeles")).toBe("Tue, Dec 31");
    expect(fmtDate(d, "UTC")).toBe("Wed, Jan 1");
  });
});
