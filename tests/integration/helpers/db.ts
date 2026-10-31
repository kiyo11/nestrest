import { PrismaClient } from "@prisma/client";
import { encrypt } from "../../../src/lib/crypto";
import { encryptGuest } from "../../../src/lib/guest";

// A dedicated Prisma client for integration tests. DATABASE_URL MUST point at a
// throwaway/local Postgres (see tests/README.md), never the shared Neon dev branch.
export const db = new PrismaClient();

export async function resetDb() {
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
}

export interface Fixture {
  propertyId: string;
  ownerId: string;
  helperId: string;
  helper2Id: string;
}

// Minimal, deterministic fixture used by the integration specs.
export async function seedMinimal(icalUrl?: string): Promise<Fixture> {
  const property = await db.property.create({
    data: {
      name: "Test Loft",
      address: "1 Test St",
      timezone: "America/Los_Angeles",
      icalUrl: icalUrl ? encrypt(icalUrl) : null,
      wifiInfo: "SSID: test / pass: test",
      doorCode: encrypt("4821"),
    },
  });
  const owner = await db.user.create({
    data: { email: "owner@test.dev", role: "OWNER", emailVerified: new Date() },
  });
  const helper = await db.user.create({
    data: { email: "helper@test.dev", role: "HELPER", emailVerified: new Date() },
  });
  const helper2 = await db.user.create({
    data: { email: "helper2@test.dev", role: "HELPER", emailVerified: new Date() },
  });
  await db.userProperty.createMany({
    data: [
      { userId: owner.id, propertyId: property.id, role: "OWNER" },
      { userId: helper.id, propertyId: property.id, role: "HELPER" },
      { userId: helper2.id, propertyId: property.id, role: "HELPER" },
    ],
  });
  return { propertyId: property.id, ownerId: owner.id, helperId: helper.id, helper2Id: helper2.id };
}

export { encrypt, encryptGuest };
