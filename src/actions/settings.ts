"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getOwnerContext } from "@/lib/context";
import { encrypt } from "@/lib/crypto";
import { syncProperty } from "@/lib/services/ical-sync";

const settingsSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  timezone: z.string().min(1),
  icalUrl: z.string().url().or(z.literal("")).optional(),
  wifiInfo: z.string().optional(),
  doorCode: z.string().optional(),
});

export async function updateSettings(input: z.infer<typeof settingsSchema>) {
  const { propertyId } = await getOwnerContext();
  const data = settingsSchema.parse(input);
  await db.property.update({
    where: { id: propertyId },
    data: {
      name: data.name,
      address: data.address,
      timezone: data.timezone,
      icalUrl: data.icalUrl ? encrypt(data.icalUrl) : null,
      wifiInfo: data.wifiInfo || null,
      doorCode: data.doorCode ? encrypt(data.doorCode) : null,
    },
  });
  revalidatePath("/settings");
  return { ok: true };
}

// Manual "Sync now" — runs the iCal sync for the active property immediately.
export async function syncNow() {
  const { propertyId } = await getOwnerContext();
  const result = await syncProperty(propertyId);
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  revalidatePath("/bookings");
  return result;
}

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  password: z.string().min(8),
});

// Simplified helper invite: owner creates a helper account + password directly.
export async function inviteHelper(input: z.infer<typeof inviteSchema>) {
  const { propertyId } = await getOwnerContext();
  const data = inviteSchema.parse(input);
  const email = data.email.toLowerCase();
  const user = await db.user.upsert({
    where: { email },
    update: { passwordHash: await bcrypt.hash(data.password, 10), role: "HELPER", name: data.name },
    create: {
      email,
      name: data.name,
      role: "HELPER",
      emailVerified: new Date(),
      passwordHash: await bcrypt.hash(data.password, 10),
    },
  });
  await db.userProperty.upsert({
    where: { userId_propertyId: { userId: user.id, propertyId } },
    update: { role: "HELPER" },
    create: { userId: user.id, propertyId, role: "HELPER" },
  });
  revalidatePath("/settings");
  return { ok: true };
}
