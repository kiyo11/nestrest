import { describe, it, expect, vi, beforeEach } from "vitest";

// redirect() throws a sentinel so we can assert the navigation target.
const { redirect, auth, findMany } = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  auth: vi.fn(),
  findMany: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/lib/db", () => ({ db: { userProperty: { findMany } } }));

import { getSessionUser, requireRole, scopeToProperty, requirePropertyId } from "@/lib/rbac";

beforeEach(() => {
  redirect.mockClear();
  auth.mockReset();
  findMany.mockReset();
});

describe("getSessionUser", () => {
  it("returns null when there is no session", async () => {
    auth.mockResolvedValue(null);
    expect(await getSessionUser()).toBeNull();
  });

  it("maps the session into a SessionUser", async () => {
    auth.mockResolvedValue({ user: { id: "u1", email: "o@x.com", role: "OWNER" } });
    expect(await getSessionUser()).toEqual({ id: "u1", email: "o@x.com", role: "OWNER" });
  });
});

describe("requireRole", () => {
  it("redirects unauthenticated users to /login", async () => {
    auth.mockResolvedValue(null);
    await expect(requireRole(["OWNER"])).rejects.toThrow("REDIRECT:/login");
  });

  it("allows a user whose role is permitted", async () => {
    auth.mockResolvedValue({ user: { id: "u1", email: "o@x.com", role: "OWNER" } });
    const u = await requireRole(["OWNER"]);
    expect(u.id).toBe("u1");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("redirects a HELPER away from an OWNER-only action to /helper", async () => {
    auth.mockResolvedValue({ user: { id: "h1", email: "h@x.com", role: "HELPER" } });
    await expect(requireRole(["OWNER"])).rejects.toThrow("REDIRECT:/helper");
  });

  it("redirects an OWNER hitting a HELPER-only action to /dashboard", async () => {
    auth.mockResolvedValue({ user: { id: "u1", email: "o@x.com", role: "OWNER" } });
    await expect(requireRole(["HELPER"])).rejects.toThrow("REDIRECT:/dashboard");
  });
});

describe("scopeToProperty", () => {
  it("returns only the property ids linked to the user", async () => {
    findMany.mockResolvedValue([{ propertyId: "p1" }, { propertyId: "p2" }]);
    expect(await scopeToProperty("u1")).toEqual(["p1", "p2"]);
    expect(findMany).toHaveBeenCalledWith({ where: { userId: "u1" }, select: { propertyId: true } });
  });

  it("returns an empty array when the user owns no properties", async () => {
    findMany.mockResolvedValue([]);
    expect(await scopeToProperty("u1")).toEqual([]);
  });
});

describe("requirePropertyId", () => {
  it("returns the first scoped property", async () => {
    findMany.mockResolvedValue([{ propertyId: "p1" }]);
    expect(await requirePropertyId("u1")).toBe("p1");
  });

  it("redirects to /login when the user has no property", async () => {
    findMany.mockResolvedValue([]);
    await expect(requirePropertyId("u1")).rejects.toThrow("REDIRECT:/login");
  });
});
