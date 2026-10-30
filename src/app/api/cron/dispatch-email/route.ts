import { NextResponse } from "next/server";
import { dispatchDue } from "@/lib/services/dispatch";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await dispatchDue();
  return NextResponse.json({ ok: true, result });
}
