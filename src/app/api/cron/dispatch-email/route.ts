import { NextResponse } from "next/server";
import { dispatchDue } from "@/lib/services/dispatch";
import { isCronAuthorized } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await dispatchDue();
  return NextResponse.json({ ok: true, result });
}
