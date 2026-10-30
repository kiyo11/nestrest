import { NextResponse } from "next/server";
import { syncAll } from "@/lib/services/ical-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev convenience
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const results = await syncAll();
  return NextResponse.json({ ok: true, results });
}
