import { test, expect } from "@playwright/test";
import { db, resetDb, seedMinimal, encryptGuest } from "./helpers/db";
import { dispatchDue } from "../../src/lib/services/dispatch";

let propertyId = "";

async function makeTemplate() {
  return db.messageTemplate.create({
    data: {
      propertyId,
      name: "Check-in",
      subject: "Hi {{guest_first_name}}",
      body: "Door {{door_code}} wifi {{wifi}} in {{checkin_date}}",
      anchor: "CHECKIN",
      offsetDir: "BEFORE",
      offsetHours: 24,
    },
  });
}

async function makeBooking(guestEmail: string | null) {
  const guest = await db.guest.create({
    data: {
      propertyId,
      ...encryptGuest({ firstName: "Lee", email: guestEmail }),
    },
  });
  return db.booking.create({
    data: {
      propertyId,
      source: "AIRBNB",
      status: "CONFIRMED",
      icalUid: `uid-${Math.random()}`,
      checkIn: new Date("2025-06-10T22:00:00Z"),
      checkOut: new Date("2025-06-14T18:00:00Z"),
      guestId: guest.id,
    },
  });
}

async function queue(bookingId: string, templateId: string, state = "PENDING") {
  return db.scheduledMessage.create({
    data: {
      propertyId,
      bookingId,
      templateId,
      anchor: "CHECKIN",
      offsetDir: "BEFORE",
      offsetHours: 24,
      scheduledFor: new Date(Date.now() - 60_000), // due a minute ago
      dedupeKey: `${bookingId}:${templateId}`,
      state: state as "PENDING",
    },
  });
}

test.afterAll(async () => db.$disconnect());
test.beforeEach(async () => {
  await resetDb();
  propertyId = (await seedMinimal()).propertyId;
});

test("sends a due message exactly once and logs it", async () => {
  const tpl = await makeTemplate();
  const booking = await makeBooking("lee@example.com");
  const sm = await queue(booking.id, tpl.id);

  const res = await dispatchDue();
  expect(res.sent).toBe(1);
  const after = await db.scheduledMessage.findUniqueOrThrow({ where: { id: sm.id } });
  expect(after.state).toBe("SENT");
  expect(after.sentAt).not.toBeNull();
  const log = await db.activityLog.findFirst({ where: { bookingId: booking.id, type: "EMAIL_SENT" } });
  expect(log).not.toBeNull();
});

test("two concurrent dispatch runs send the message only once (claim logic)", async () => {
  const tpl = await makeTemplate();
  const booking = await makeBooking("lee@example.com");
  await queue(booking.id, tpl.id);

  const [a, b] = await Promise.all([dispatchDue(), dispatchDue()]);
  expect(a.sent + b.sent).toBe(1);
  expect(await db.scheduledMessage.count({ where: { state: "SENT" } })).toBe(1);
});

test("a re-run after SENT does not re-send (idempotent)", async () => {
  const tpl = await makeTemplate();
  const booking = await makeBooking("lee@example.com");
  await queue(booking.id, tpl.id);
  await dispatchDue();
  const second = await dispatchDue();
  expect(second.processed).toBe(0);
  expect(second.sent).toBe(0);
});

test("missing guest email -> SKIPPED, not SENT (revert window)", async () => {
  const tpl = await makeTemplate();
  const booking = await makeBooking(null);
  const sm = await queue(booking.id, tpl.id);
  const res = await dispatchDue();
  expect(res.skipped).toBe(1);
  expect(res.sent).toBe(0);
  const after = await db.scheduledMessage.findUniqueOrThrow({ where: { id: sm.id } });
  expect(after.state).toBe("SKIPPED");
});

test("unresolved merge field -> FAILED with an error message", async () => {
  // door_code unresolved: blank the property door code.
  await db.property.update({ where: { id: propertyId }, data: { doorCode: null, wifiInfo: null } });
  const tpl = await makeTemplate();
  const booking = await makeBooking("lee@example.com");
  const sm = await queue(booking.id, tpl.id);
  const res = await dispatchDue();
  expect(res.failed).toBe(1);
  expect(res.sent).toBe(0);
  const after = await db.scheduledMessage.findUniqueOrThrow({ where: { id: sm.id } });
  expect(after.state).toBe("FAILED");
  expect(after.error).toMatch(/Unresolved merge fields/);
});

test("does not fire messages whose scheduledFor is in the future", async () => {
  const tpl = await makeTemplate();
  const booking = await makeBooking("lee@example.com");
  await db.scheduledMessage.create({
    data: {
      propertyId,
      bookingId: booking.id,
      templateId: tpl.id,
      anchor: "CHECKIN",
      offsetDir: "BEFORE",
      offsetHours: 24,
      scheduledFor: new Date(Date.now() + 3_600_000),
      dedupeKey: `${booking.id}:${tpl.id}`,
      state: "PENDING",
    },
  });
  const res = await dispatchDue();
  expect(res.processed).toBe(0);
});
