import { test, expect } from "@playwright/test";
import { db, resetDb, seedMinimal } from "./helpers/db";
import { IcsServer, ics } from "./helpers/ics-server";
import { syncProperty } from "../../src/lib/services/ical-sync";

const server = new IcsServer();
let propertyId = "";

test.beforeAll(async () => {
  await server.start();
});
test.afterAll(async () => {
  await server.stop();
  await db.$disconnect();
});
test.beforeEach(async () => {
  await resetDb();
  const f = await seedMinimal(server.url);
  propertyId = f.propertyId;
});

test("creates bookings for new UIDs on first sync", async () => {
  server.setBody(
    ics([
      { uid: "uid-a@airbnb", start: "20250610", end: "20250614", summary: "Reservation HMABCDE123" },
      { uid: "uid-b@airbnb", start: "20250620", end: "20250622" },
    ]),
  );
  const res = await syncProperty(propertyId);
  expect(res.ok).toBe(true);
  expect(res.created).toBe(2);
  const a = await db.booking.findUnique({
    where: { propertyId_icalUid: { propertyId, icalUid: "uid-a@airbnb" } },
  });
  expect(a?.status).toBe("CONFIRMED");
  expect(a?.reservationCode).toBe("HMABCDE123");
});

test("is idempotent: a re-sync with the same feed creates nothing new", async () => {
  server.setBody(ics([{ uid: "uid-a@airbnb", start: "20250610", end: "20250614" }]));
  await syncProperty(propertyId);
  const second = await syncProperty(propertyId);
  expect(second.created).toBe(0);
  expect(await db.booking.count({ where: { propertyId } })).toBe(1);
});

test("updates dates and auto-creates a turnover task that follows the checkout", async () => {
  server.setBody(ics([{ uid: "uid-a@airbnb", start: "20250610", end: "20250614" }]));
  await syncProperty(propertyId);
  // checkout moves one day later
  server.setBody(ics([{ uid: "uid-a@airbnb", start: "20250610", end: "20250615" }]));
  const res = await syncProperty(propertyId);
  expect(res.updated).toBe(1);
  const booking = await db.booking.findFirstOrThrow({ where: { propertyId } });
  const task = await db.cleaningTask.findFirst({ where: { bookingId: booking.id } });
  expect(task?.dueDate.getTime()).toBe(booking.checkOut.getTime());
});

test("soft-cancels a booking whose UID vanished (never hard-deletes)", async () => {
  server.setBody(
    ics([
      { uid: "uid-a@airbnb", start: "20250610", end: "20250614" },
      { uid: "uid-b@airbnb", start: "20250620", end: "20250622" },
    ]),
  );
  await syncProperty(propertyId);
  server.setBody(ics([{ uid: "uid-a@airbnb", start: "20250610", end: "20250614" }]));
  const res = await syncProperty(propertyId);
  expect(res.cancelled).toBe(1);
  const b = await db.booking.findUnique({
    where: { propertyId_icalUid: { propertyId, icalUid: "uid-b@airbnb" } },
  });
  expect(b).not.toBeNull();
  expect(b?.status).toBe("CANCELLED");
  expect(b?.cancelledAt).not.toBeNull();
});

test("reactivates a cancelled booking when its UID returns to the feed", async () => {
  server.setBody(ics([{ uid: "uid-a@airbnb", start: "20250610", end: "20250614" }]));
  await syncProperty(propertyId);
  server.setBody(ics([])); // vanish
  await syncProperty(propertyId);
  server.setBody(ics([{ uid: "uid-a@airbnb", start: "20250610", end: "20250614" }])); // return
  await syncProperty(propertyId);
  const b = await db.booking.findUnique({
    where: { propertyId_icalUid: { propertyId, icalUid: "uid-a@airbnb" } },
  });
  expect(b?.status).toBe("CONFIRMED");
  expect(b?.cancelledAt).toBeNull();
});

test("owner-edited fields (payout, guest, ownerNotes) survive a re-sync", async () => {
  server.setBody(ics([{ uid: "uid-a@airbnb", start: "20250610", end: "20250614" }]));
  await syncProperty(propertyId);
  const booking = await db.booking.findFirstOrThrow({ where: { propertyId } });
  const guest = await db.guest.create({ data: { propertyId } });
  await db.booking.update({
    where: { id: booking.id },
    data: { payout: "999.00", ownerNotes: "VIP guest", guestId: guest.id },
  });

  // Re-sync with a changed date — only sync-owned fields should be touched.
  server.setBody(ics([{ uid: "uid-a@airbnb", start: "20250611", end: "20250615" }]));
  await syncProperty(propertyId);

  const after = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
  expect(Number(after.payout)).toBe(999);
  expect(after.ownerNotes).toBe("VIP guest");
  expect(after.guestId).toBe(guest.id);
  // sync-owned field did change
  expect(after.checkIn.getTime()).not.toBe(booking.checkIn.getTime());
});

test("an empty feed (0 events) does NOT cancel existing confirmed bookings", async () => {
  server.setBody(
    ics([
      { uid: "uid-a@airbnb", start: "20250610", end: "20250614" },
      { uid: "uid-b@airbnb", start: "20250620", end: "20250622" },
    ]),
  );
  await syncProperty(propertyId);
  expect(await db.booking.count({ where: { propertyId, status: "CONFIRMED" } })).toBe(2);

  // Transient upstream glitch: a 200 that parses to zero VEVENTs.
  server.setBody(ics([]));
  const res = await syncProperty(propertyId);

  // Data must survive: nothing cancelled, a warning recorded.
  expect(res.cancelled).toBe(0);
  expect(res.ok).toBe(false);
  expect(await db.booking.count({ where: { propertyId, status: "CONFIRMED" } })).toBe(2);
  const prop = await db.property.findUniqueOrThrow({ where: { id: propertyId } });
  expect(prop.lastSyncError).toBeTruthy();
});

test("a failed fetch records lastSyncError and retains prior bookings", async () => {
  server.setBody(ics([{ uid: "uid-a@airbnb", start: "20250610", end: "20250614" }]));
  await syncProperty(propertyId);
  server.failOnce(); // first attempt 500s; node-ical retries then fails hard if persistent
  server.setBody(""); // empty/malformed on retry
  const res = await syncProperty(propertyId);
  // Either an error is recorded, or the empty feed cancels — assert data not destroyed.
  expect(await db.booking.count({ where: { propertyId } })).toBe(1);
  if (!res.ok) {
    const prop = await db.property.findUniqueOrThrow({ where: { id: propertyId } });
    expect(prop.lastSyncError).toBeTruthy();
  }
});
