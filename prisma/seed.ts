import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { encrypt } from "../src/lib/crypto";
import { encryptGuest } from "../src/lib/guest";
import { enqueueForBooking } from "../src/lib/services/scheduler";

const db = new PrismaClient();

const OWNER_EMAIL = "owner@nestrest.dev";
const HELPER_EMAIL = "helper@nestrest.dev";
const HELPER_PASSWORD = "helper1234";

function daysFromNow(n: number, hour = 15): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function main() {
  console.log("Seeding NestRest…");

  // Clean slate (safe on a dev DB).
  await db.checklistItem.deleteMany();
  await db.cleaningTask.deleteMany();
  await db.scheduledMessage.deleteMany();
  await db.activityLog.deleteMany();
  await db.messageTemplate.deleteMany();
  await db.calendarBlock.deleteMany();
  await db.booking.deleteMany();
  await db.guest.deleteMany();
  await db.userProperty.deleteMany();
  await db.property.deleteMany();
  await db.user.deleteMany();

  const property = await db.property.create({
    data: {
      name: "Maple Street Loft",
      address: "14 Maple St, Unit A, Portland, OR",
      timezone: "America/Los_Angeles",
      icalUrl: null, // set a real Airbnb iCal URL in Settings to enable sync
      wifiInfo: "SSID: MapleLoft · pass: nestwelcome",
      doorCode: encrypt("4821"),
    },
  });

  const owner = await db.user.create({
    data: {
      email: OWNER_EMAIL,
      name: "Jess Owner",
      role: "OWNER",
      emailVerified: new Date(),
    },
  });

  const helper = await db.user.create({
    data: {
      email: HELPER_EMAIL,
      name: "Alex Helper",
      role: "HELPER",
      emailVerified: new Date(),
      passwordHash: await bcrypt.hash(HELPER_PASSWORD, 10),
    },
  });

  await db.userProperty.createMany({
    data: [
      { userId: owner.id, propertyId: property.id, role: "OWNER" },
      { userId: helper.id, propertyId: property.id, role: "HELPER" },
    ],
  });

  // Guests (PII encrypted)
  const lee = await db.guest.create({
    data: { propertyId: property.id, ...encryptGuest({ firstName: "Lee", lastName: "M.", email: "lee@example.com", phone: "+1 555 0101" }) },
  });
  const kim = await db.guest.create({
    data: { propertyId: property.id, ...encryptGuest({ firstName: "Kim", lastName: "R.", email: "kim@example.com" }) },
  });

  // Templates with triggers
  const checkinTpl = await db.messageTemplate.create({
    data: {
      propertyId: property.id,
      name: "Check-in instructions",
      subject: "Your check-in details for {{checkin_date}}",
      body: "Hi {{guest_first_name}},\n\nYour door code is {{door_code}}.\nWiFi: {{wifi}}.\nCheck-in is {{checkin_date}}. Enjoy your stay!",
      anchor: "CHECKIN",
      offsetDir: "BEFORE",
      offsetHours: 24,
    },
  });
  await db.messageTemplate.create({
    data: {
      propertyId: property.id,
      name: "Review request",
      subject: "Thanks for staying, {{guest_first_name}}!",
      body: "Hi {{guest_first_name}},\n\nThanks for staying with us (checkout {{checkout_date}}). We'd love a review!",
      anchor: "CHECKOUT",
      offsetDir: "AFTER",
      offsetHours: 6,
    },
  });
  await db.messageTemplate.create({
    data: {
      propertyId: property.id,
      name: "Welcome",
      subject: "Welcome, {{guest_first_name}}",
      body: "Hi {{guest_first_name}}, welcome! Reach out any time.",
    },
  });

  // Bookings
  const upcoming = await db.booking.create({
    data: {
      propertyId: property.id,
      source: "AIRBNB",
      status: "CONFIRMED",
      reservationCode: "HMABCD1234",
      icalUid: "seed-lee-upcoming@airbnb",
      checkIn: daysFromNow(1, 15),
      checkOut: daysFromNow(5, 11),
      payout: "680.00",
      summary: "Reservation (Airbnb)",
      guestId: lee.id,
    },
  });

  // Confirmed booking missing guest email -> dashboard action item + scheduled skip
  const noEmailGuest = await db.guest.create({
    data: { propertyId: property.id, ...encryptGuest({ firstName: "Ray", lastName: "T." }) },
  });
  await db.booking.create({
    data: {
      propertyId: property.id,
      source: "AIRBNB",
      status: "CONFIRMED",
      reservationCode: "HMEFGH5678",
      icalUid: "seed-ray@airbnb",
      checkIn: daysFromNow(2, 15),
      checkOut: daysFromNow(4, 11),
      payout: "510.00",
      summary: "Reservation (Airbnb)",
      guestId: noEmailGuest.id,
    },
  });

  const past = await db.booking.create({
    data: {
      propertyId: property.id,
      source: "AIRBNB",
      status: "COMPLETED",
      reservationCode: "HMIJKL9012",
      icalUid: "seed-kim-past@airbnb",
      checkIn: daysFromNow(-10, 15),
      checkOut: daysFromNow(-6, 11),
      payout: "720.00",
      summary: "Reservation (Airbnb)",
      guestId: kim.id,
    },
  });

  // Manual block (maintenance)
  await db.calendarBlock.create({
    data: {
      propertyId: property.id,
      start: daysFromNow(7, 0),
      end: daysFromNow(9, 0),
      reason: "MAINTENANCE",
      note: "Deep clean + repaint",
    },
  });

  // Activity timeline sample
  await db.activityLog.createMany({
    data: [
      { propertyId: property.id, bookingId: upcoming.id, type: "SYNC_CREATED", message: "Booking created from Airbnb sync" },
      { propertyId: property.id, bookingId: upcoming.id, type: "EDITED", actorId: owner.id, message: "Owner set payout and guest contact" },
    ],
  });

  // Turnover tasks
  const CHECKLIST = ["Strip & start laundry", "Bathrooms", "Kitchen reset", "Vacuum & mop", "Restock toiletries", "Fresh linens", "Trash out", "Final photos"];
  await db.cleaningTask.create({
    data: {
      propertyId: property.id,
      bookingId: upcoming.id,
      assigneeId: helper.id,
      status: "IN_PROGRESS",
      dueDate: daysFromNow(5, 11),
      accessNotes: "Lockbox code 4821, side door.",
      nextCheckIn: daysFromNow(6, 15),
      items: { create: CHECKLIST.map((label, order) => ({ label, order, done: order < 3 })) },
    },
  });
  await db.cleaningTask.create({
    data: {
      propertyId: property.id,
      bookingId: past.id,
      assigneeId: helper.id,
      status: "DONE",
      dueDate: daysFromNow(-6, 11),
      accessNotes: "Lockbox code 4821, side door.",
      items: { create: CHECKLIST.map((label, order) => ({ label, order, done: true })) },
    },
  });
  // Overdue open task -> dashboard action item
  await db.cleaningTask.create({
    data: {
      propertyId: property.id,
      status: "TODO",
      dueDate: daysFromNow(-1, 11),
      accessNotes: "Lockbox code 4821, side door.",
      items: { create: CHECKLIST.map((label, order) => ({ label, order })) },
    },
  });

  // Enqueue scheduled messages for the confirmed upcoming bookings
  await enqueueForBooking(upcoming.id);

  console.log(`Seed complete.
  Property: ${property.name} (${property.id})
  Owner login (magic link): ${OWNER_EMAIL}
  Helper login (password):  ${HELPER_EMAIL} / ${HELPER_PASSWORD}
  Default template trigger: '${checkinTpl.name}' 24h before check-in`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
