// Authorize a Vercel Cron call via CRON_SECRET (sent as `Authorization: Bearer`).
// Fails CLOSED in production: a missing/mismatched secret is rejected so the
// endpoints are never world-callable. The open path exists ONLY for non-prod
// developer convenience.
export function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
