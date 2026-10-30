import { DateTime } from "luxon";

export const MERGE_FIELDS = [
  "guest_first_name",
  "checkin_date",
  "checkout_date",
  "door_code",
  "wifi",
] as const;

export type MergeField = (typeof MERGE_FIELDS)[number];

export interface MergeContext {
  guest_first_name?: string | null;
  checkin_date?: string | null;
  checkout_date?: string | null;
  door_code?: string | null;
  wifi?: string | null;
}

export interface RenderResult {
  text: string;
  missing: MergeField[];
}

const TOKEN = /\{\{\s*([a-z_]+)\s*\}\}/g;

// Render a template body against a context. Any referenced merge field that has
// no value is collected in `missing` so the caller can block the send (per AC).
export function renderTemplate(body: string, ctx: MergeContext): RenderResult {
  const missing = new Set<MergeField>();
  const text = body.replace(TOKEN, (full, raw: string) => {
    const field = raw as MergeField;
    if (!(MERGE_FIELDS as readonly string[]).includes(field)) return full;
    const value = ctx[field];
    if (value == null || value === "") {
      missing.add(field);
      return full; // leave token visible so the owner sees what is unresolved
    }
    return value;
  });
  return { text, missing: [...missing] };
}

export function fmtDate(date: Date, tz: string): string {
  return DateTime.fromJSDate(date, { zone: tz }).toFormat("ccc, LLL d");
}
