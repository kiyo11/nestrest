import { describe, it, expect } from "vitest";
import { overlapNights } from "@/lib/services/dashboard";

const monthStart = new Date("2025-06-01T00:00:00Z");
const monthEnd = new Date("2025-07-01T00:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

describe("overlapNights (occupancy / revenue math)", () => {
  it("counts nights fully inside the month", () => {
    expect(
      overlapNights(new Date("2025-06-10T00:00:00Z"), new Date("2025-06-14T00:00:00Z"), monthStart, monthEnd),
    ).toBe(4);
  });

  it("clamps a stay that starts before the month", () => {
    expect(
      overlapNights(new Date("2025-05-28T00:00:00Z"), new Date("2025-06-03T00:00:00Z"), monthStart, monthEnd),
    ).toBe(2);
  });

  it("clamps a stay that ends after the month", () => {
    expect(
      overlapNights(new Date("2025-06-29T00:00:00Z"), new Date("2025-07-05T00:00:00Z"), monthStart, monthEnd),
    ).toBe(2);
  });

  it("returns 0 for a stay entirely outside the month", () => {
    expect(
      overlapNights(new Date("2025-08-01T00:00:00Z"), new Date("2025-08-05T00:00:00Z"), monthStart, monthEnd),
    ).toBe(0);
  });

  it("returns 0 for a zero-length range", () => {
    const d = new Date("2025-06-10T00:00:00Z");
    expect(overlapNights(d, d, monthStart, monthEnd)).toBe(0);
  });

  it("returns 0 when end precedes start (defensive)", () => {
    expect(
      overlapNights(new Date("2025-06-14T00:00:00Z"), new Date("2025-06-10T00:00:00Z"), monthStart, monthEnd),
    ).toBe(0);
  });

  it("a full-month stay equals the number of days in the window", () => {
    expect(overlapNights(monthStart, monthEnd, monthStart, monthEnd)).toBe(
      Math.round((monthEnd.getTime() - monthStart.getTime()) / DAY),
    );
  });
});
