import { createServer, type Server } from "node:http";

// Serves a swappable ICS body on localhost so ical-sync can fetch a fixture URL
// instead of reaching out to Airbnb. Call setBody() between sync runs.
export class IcsServer {
  private server: Server;
  private body = "";
  private failNext = false;
  public url = "";

  constructor() {
    this.server = createServer((_req, res) => {
      if (this.failNext) {
        this.failNext = false;
        res.statusCode = 500;
        res.end("boom");
        return;
      }
      res.setHeader("content-type", "text/calendar");
      res.end(this.body);
    });
  }

  async start(): Promise<string> {
    await new Promise<void>((resolve) => this.server.listen(0, resolve));
    const addr = this.server.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;
    this.url = `http://127.0.0.1:${port}/calendar.ics`;
    return this.url;
  }

  setBody(body: string) {
    this.body = body;
  }

  failOnce() {
    this.failNext = true;
  }

  async stop() {
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
  }
}

// Build a VCALENDAR from a list of events.
export function ics(events: { uid: string; start: string; end: string; summary?: string }[]): string {
  const vevents = events
    .map((e) =>
      [
        "BEGIN:VEVENT",
        `UID:${e.uid}`,
        `DTSTART:${e.start}`,
        `DTEND:${e.end}`,
        `SUMMARY:${e.summary ?? "Reserved"}`,
        "END:VEVENT",
      ].join("\r\n"),
    )
    .join("\r\n");
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//NestRest//test//EN", vevents, "END:VCALENDAR"].join(
    "\r\n",
  );
}
