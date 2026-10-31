import { describe, it, expect } from "vitest";
import { computeScheduledFor } from "@/lib/services/scheduler";

const booking = {
  checkIn: new Date("2025-06-10T15:00:00Z"),
  checkOut: new Date("2025-06-14T11:00:00Z"),
};
const HOUR = 60 * 60 * 1000;

describe("computeScheduledFor", () => {
  it("fires 24h BEFORE check-in", () => {
    const at = computeScheduledFor(booking, "CHECKIN", "BEFORE", 24);
    expect(at.getTime()).toBe(booking.checkIn.getTime() - 24 * HOUR);
  });

  it("fires 6h AFTER check-out", () => {
    const at = computeScheduledFor(booking, "CHECKOUT", "AFTER", 6);
    expect(at.getTime()).toBe(booking.checkOut.getTime() + 6 * HOUR);
  });

  it("anchors on check-out when anchor is CHECKOUT", () => {
    const at = computeScheduledFor(booking, "CHECKOUT", "BEFORE", 2);
    expect(at.getTime()).toBe(booking.checkOut.getTime() - 2 * HOUR);
  });

  it("a zero offset lands exactly on the anchor", () => {
    const at = computeScheduledFor(booking, "CHECKIN", "AFTER", 0);
    expect(at.getTime()).toBe(booking.checkIn.getTime());
  });

  it("recomputes to new dates when the anchor date shifts (sync change)", () => {
    const moved = {
      checkIn: new Date("2025-06-12T15:00:00Z"),
      checkOut: booking.checkOut,
    };
    const before = computeScheduledFor(booking, "CHECKIN", "BEFORE", 24);
    const after = computeScheduledFor(moved, "CHECKIN", "BEFORE", 24);
    expect(after.getTime() - before.getTime()).toBe(2 * 24 * HOUR);
  });
});
