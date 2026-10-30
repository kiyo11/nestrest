import { redirect } from "next/navigation";
import { auth } from "./auth";
import { db } from "./db";

type AppRole = "OWNER" | "HELPER";

export interface SessionUser {
  id: string;
  email: string;
  role: AppRole;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    role: session.user.role,
  };
}

// Throws (renders the nearest forbidden.tsx / 403) unless the signed-in user's
// role is permitted. Call at the top of every guarded server action & layout.
export async function requireRole(roles: AppRole[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!roles.includes(user.role)) {
    // Send users to their own home rather than leaking a raw error.
    redirect(user.role === "HELPER" ? "/helper" : "/dashboard");
  }
  return user;
}

// Property IDs the user may touch, via UserProperty. All queries filter by these.
export async function scopeToProperty(userId: string): Promise<string[]> {
  const rows = await db.userProperty.findMany({
    where: { userId },
    select: { propertyId: true },
  });
  return rows.map((r) => r.propertyId);
}

// Convenience: the single active property for v1 (first scoped property).
export async function requirePropertyId(userId: string): Promise<string> {
  const ids = await scopeToProperty(userId);
  if (ids.length === 0) redirect("/login");
  return ids[0];
}
