import { describe, it, expect } from "vitest";
import { parseReservationCode } from "@/lib/services/ical-sync";

describe("parseReservationCode", () => {
  it("extracts an Airbnb reservation code from the summary", () => {
    expect(parseReservationCode("Reservation HMABCDE123")).toBe("HMABCDE123");
  });

  it("scans fields in order and returns the first match", () => {
    expect(parseReservationCode(undefined, "no code here", "https://airbnb.com/HMZZZ99999")).toBe(
      "HMZZZ99999",
    );
  });

  it("returns null when no code is present", () => {
    expect(parseReservationCode("Airbnb (Not available)", "blocked")).toBeNull();
  });

  it("ignores undefined fields", () => {
    expect(parseReservationCode(undefined, undefined)).toBeNull();
  });

  it("does not match a short code below the minimum length", () => {
    expect(parseReservationCode("H123")).toBeNull();
  });
});
