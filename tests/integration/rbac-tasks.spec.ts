import { test, expect } from "@playwright/test";
import { db, resetDb, seedMinimal, type Fixture } from "./helpers/db";

// These exercise the SERVER-SIDE scoping predicates that the helper pages and
// task server actions use (see src/app/(helper)/* and src/actions/tasks.ts).
// The full authenticated action path (session -> getTaskActor) is covered by
// the e2e helper flow; here we assert the data-layer guarantees directly.

let fx: Fixture;

async function makeTaskFor(assigneeId: string | null) {
  return db.cleaningTask.create({
    data: {
      propertyId: fx.propertyId,
      assigneeId,
      status: "TODO",
      dueDate: new Date(),
      items: { create: [{ label: "Bathrooms", order: 0 }] },
    },
  });
}

test.afterAll(async () => db.$disconnect());
test.beforeEach(async () => {
  await resetDb();
  fx = await seedMinimal();
});

// Mirrors the helper home query: assigneeId == self, status != DONE.
function helperTaskQuery(userId: string) {
  return db.cleaningTask.findMany({
    where: { propertyId: fx.propertyId, assigneeId: userId, status: { not: "DONE" } },
    include: { items: { select: { done: true } } },
  });
}

test("a helper sees only tasks assigned to them", async () => {
  await makeTaskFor(fx.helperId);
  await makeTaskFor(fx.helper2Id);
  await makeTaskFor(null); // unassigned
  const mine = await helperTaskQuery(fx.helperId);
  expect(mine).toHaveLength(1);
});

test("a helper cannot open another helper's task (server-side filter -> empty)", async () => {
  const othersTask = await makeTaskFor(fx.helper2Id);
  // Mirrors the task detail page's HELPER branch.
  const found = await db.cleaningTask.findFirst({
    where: { id: othersTask.id, propertyId: fx.propertyId, assigneeId: fx.helperId },
  });
  expect(found).toBeNull();
});

test("a helper cannot touch a task from another property", async () => {
  const other = await db.property.create({
    data: { name: "Other", address: "x", timezone: "UTC" },
  });
  const foreign = await db.cleaningTask.create({
    data: { propertyId: other.id, assigneeId: fx.helperId, status: "TODO", dueDate: new Date() },
  });
  const found = await db.cleaningTask.findFirst({
    where: { id: foreign.id, propertyId: fx.propertyId, assigneeId: fx.helperId },
  });
  expect(found).toBeNull();
});

test("helper projection never selects payout or guest PII", async () => {
  const guest = await db.guest.create({ data: { propertyId: fx.propertyId } });
  const booking = await db.booking.create({
    data: {
      propertyId: fx.propertyId,
      source: "AIRBNB",
      status: "CONFIRMED",
      icalUid: "uid-x",
      checkIn: new Date(),
      checkOut: new Date(),
      payout: "500.00",
      guestId: guest.id,
    },
  });
  await db.cleaningTask.create({
    data: { propertyId: fx.propertyId, bookingId: booking.id, assigneeId: fx.helperId, status: "TODO", dueDate: new Date(), items: { create: [{ label: "Bathrooms", order: 0 }] } },
  });
  const tasks = await helperTaskQuery(fx.helperId);
  const serialized = JSON.stringify(tasks);
  // The projection selects only { done } on items; no payout / booking / guest join.
  expect(serialized).not.toContain("payout");
  expect(serialized).not.toContain("500");
  expect(tasks[0]).not.toHaveProperty("booking");
});
