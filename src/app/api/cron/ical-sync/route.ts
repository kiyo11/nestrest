import { NextResponse } from "next/server";
import { syncAll } from "@/lib/services/ical-sync";
import { isCronAuthorized } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const results = await syncAll();
  return NextResponse.json({ ok: true, results });
}
