import { requireRole, requirePropertyId } from "./rbac";
import { db } from "./db";

// Resolve the signed-in owner + their single active property (v1).
export async function getOwnerContext() {
  const user = await requireRole(["OWNER"]);
  const propertyId = await requirePropertyId(user.id);
  const property = await db.property.findUniqueOrThrow({ where: { id: propertyId } });
  return { user, propertyId, property };
}

// Helper or owner (both may touch task flows). Returns scoped property IDs.
export async function getTaskActor() {
  const user = await requireRole(["OWNER", "HELPER"]);
  const propertyId = await requirePropertyId(user.id);
  return { user, propertyId };
}
