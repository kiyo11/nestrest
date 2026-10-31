/**
 * One-time production bootstrap: create the owner's Property and an OWNER
 * UserProperty link so the account works on first magic-link sign-in.
 *
 * Idempotent: if the owner already has an OWNER property link, it does nothing.
 * Creates NO sample bookings/guests/tasks — this is for real production use.
 *
 * Usage (against the production DB):
 *   OWNER_EMAIL="you@example.com" \
 *   OWNER_NAME="Your Name" \
 *   PROPERTY_NAME="The Cedar Cabin" \
 *   PROPERTY_ADDRESS="123 Pine Rd, Portland, OR" \
 *   PROPERTY_TZ="America/Los_Angeles" \
 *   DATABASE_URL=... DIRECT_URL=... npx tsx scripts/bootstrap-owner.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const email = process.env.OWNER_EMAIL;
const name = process.env.OWNER_NAME ?? null;
const propertyName = process.env.PROPERTY_NAME;
const address = process.env.PROPERTY_ADDRESS ?? "";
const timezone = process.env.PROPERTY_TZ ?? "America/Los_Angeles";

async function main() {
  if (!email || !propertyName) {
    throw new Error("OWNER_EMAIL and PROPERTY_NAME are required");
  }

  const user = await db.user.upsert({
    where: { email },
    update: { role: "OWNER", ...(name ? { name } : {}) },
    create: { email, name, role: "OWNER" },
  });

  const existing = await db.userProperty.findFirst({
    where: { userId: user.id, role: "OWNER" },
  });
  if (existing) {
    console.log(
      `Owner ${email} is already linked to property ${existing.propertyId} — nothing to do.`,
    );
    return;
  }

  const property = await db.property.create({
    data: { name: propertyName, address, timezone },
  });
  await db.userProperty.create({
    data: { userId: user.id, propertyId: property.id, role: "OWNER" },
  });

  console.log(
    `✓ Created property "${propertyName}" (${property.id}) in ${timezone} and linked owner ${email}.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
