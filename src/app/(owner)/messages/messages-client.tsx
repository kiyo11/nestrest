"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Trash2, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { previewTemplate, upsertTemplate, deleteTemplate } from "@/actions/templates";
import { sendNow, cancelScheduledMessage } from "@/actions/email";

export interface TemplateRow {
  id: string;
  name: string;
  subject: string;
  body: string;
  anchor: "CHECKIN" | "CHECKOUT" | null;
  offsetDir: "BEFORE" | "AFTER" | null;
  offsetHours: number | null;
  trigger: string;
}
export interface BookingOpt {
  id: string;
  label: string;
  hasEmail: boolean;
}
export interface ScheduledRow {
  id: string;
  when: string;
  templateName: string;
  guest: string;
  state: string;
  hasEmail: boolean;
}

export function MessagesClient({
  templates,
  bookings,
  scheduled,
}: {
  templates: TemplateRow[];
  bookings: BookingOpt[];
  scheduled: ScheduledRow[];
}) {
  return (
    <Tabs defaultValue="compose">
      <TabsList>
        <TabsTrigger value="compose">Compose</TabsTrigger>
        <TabsTrigger value="templates">Templates</TabsTrigger>
        <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
      </TabsList>
      <TabsContent value="compose">
        <Compose templates={templates} bookings={bookings} />
      </TabsContent>
      <TabsContent value="templates">
        <TemplatesManager templates={templates} />
      </TabsContent>
      <TabsContent value="scheduled">
        <ScheduledList rows={scheduled} />
      </TabsContent>
    </Tabs>
  );
}

function Compose({ templates, bookings }: { templates: TemplateRow[]; bookings: BookingOpt[] }) {
  const router = useRouter();
  const [bookingId, setBookingId] = React.useState(bookings[0]?.id ?? "");
  const [subject, setSubject] = React.useState(templates[0]?.subject ?? "");
  const [body, setBody] = React.useState(templates[0]?.body ?? "");
  const [preview, setPreview] = React.useState<{ subject: string; body: string; missing: string[]; hasGuestEmail: boolean } | null>(null);
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    if (!bookingId) return;
    let active = true;
    previewTemplate(bookingId, subject, body).then((r) => active && setPreview(r));
    return () => {
      active = false;
    };
  }, [bookingId, subject, body]);

  function applyTemplate(id: string) {
    const t = templates.find((x) => x.id === id);
    if (t) {
      setSubject(t.subject);
      setBody(t.body);
    }
  }

  const blocked = !preview?.hasGuestEmail || (preview?.missing.length ?? 0) > 0;

  async function onSend() {
    setSending(true);
    try {
      const res = await sendNow({ bookingId, subject, body });
      if (!res.ok && res.reason === "no_email") toast.error("No email on file for this guest.");
      else if (!res.ok && res.reason === "unresolved") toast.error(`Unresolved: ${res.missing?.join(", ")}`);
      else toast.success(res.logged ? "Email logged (dev — set RESEND_API_KEY)" : "Email sent.");
      router.refresh();
    } catch {
      toast.error("Send failed.");
    } finally {
      setSending(false);
    }
  }

  if (bookings.length === 0)
    return <EmptyState text="No confirmed bookings to message yet." />;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Editor</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Booking</Label>
            <Select value={bookingId} onValueChange={setBookingId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {bookings.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Start from template</Label>
            <Select onValueChange={applyTemplate}>
              <SelectTrigger><SelectValue placeholder="Pick a template" /></SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="body">Body</Label>
            <Textarea id="body" className="min-h-40" value={body} onChange={(e) => setBody(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Merge fields: {"{{guest_first_name}} {{checkin_date}} {{checkout_date}} {{door_code}} {{wifi}}"}
            </p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preview</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="rounded-md border border-border p-3">
            <p className="text-sm font-medium">{preview?.subject}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{preview?.body}</p>
          </div>
          {!preview?.hasGuestEmail ? (
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <div>No email on file for this guest — add one on the booking.</div>
            </Alert>
          ) : null}
          {preview && preview.missing.length > 0 ? (
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <div>Unresolved: {preview.missing.join(", ")}. Fill in settings/booking to send.</div>
            </Alert>
          ) : null}
          <Button onClick={onSend} disabled={blocked} loading={sending} className="self-start">
            Send now
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function TemplatesManager({ templates }: { templates: TemplateRow[] }) {
  const router = useRouter();
  const blank: TemplateRow = {
    id: "",
    name: "",
    subject: "",
    body: "",
    anchor: null,
    offsetDir: null,
    offsetHours: null,
    trigger: "manual",
  };
  const [editing, setEditing] = React.useState<TemplateRow | null>(null);
  const [saving, setSaving] = React.useState(false);

  async function save() {
    if (!editing) return;
    setSaving(true);
    try {
      await upsertTemplate({
        id: editing.id || undefined,
        name: editing.name,
        subject: editing.subject,
        body: editing.body,
        anchor: editing.anchor,
        offsetDir: editing.offsetDir,
        offsetHours: editing.offsetHours,
      });
      toast.success("Template saved.");
      setEditing(null);
      router.refresh();
    } catch {
      toast.error("Could not save template.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await deleteTemplate(id);
    toast.success("Template deleted.");
    router.refresh();
  }

  if (editing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{editing.id ? "Edit" : "New"} template</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Name</Label>
            <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Subject</Label>
            <Input value={editing.subject} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Body</Label>
            <Textarea className="min-h-40" value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Anchor</Label>
              <Select
                value={editing.anchor ?? "none"}
                onValueChange={(v) => setEditing({ ...editing, anchor: v === "none" ? null : (v as "CHECKIN" | "CHECKOUT") })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Manual</SelectItem>
                  <SelectItem value="CHECKIN">Check-in</SelectItem>
                  <SelectItem value="CHECKOUT">Checkout</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Direction</Label>
              <Select
                value={editing.offsetDir ?? "BEFORE"}
                onValueChange={(v) => setEditing({ ...editing, offsetDir: v as "BEFORE" | "AFTER" })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BEFORE">Before</SelectItem>
                  <SelectItem value="AFTER">After</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Hours</Label>
              <Input
                type="number"
                value={editing.offsetHours ?? ""}
                onChange={(e) => setEditing({ ...editing, offsetHours: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={save} loading={saving}>Save template</Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-lg">Templates</CardTitle>
        <Button size="sm" onClick={() => setEditing(blank)}>
          <Plus className="h-4 w-4" /> New template
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {templates.length === 0 ? (
          <EmptyState text="Create your first template to send consistent guest messages." />
        ) : (
          templates.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.trigger}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(t)}>Edit</Button>
                <Button size="icon" variant="ghost" aria-label="Delete template" onClick={() => remove(t.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function ScheduledList({ rows }: { rows: ScheduledRow[] }) {
  const router = useRouter();
  const [tab, setTab] = React.useState<"upcoming" | "sent">("upcoming");
  const upcoming = rows.filter((r) => r.state === "PENDING");
  const sent = rows.filter((r) => r.state !== "PENDING");
  const shown = tab === "upcoming" ? upcoming : sent;

  async function cancel(id: string) {
    await cancelScheduledMessage(id);
    toast.success("Scheduled message cancelled.");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-lg">Scheduled messages</CardTitle>
        <Tabs value={tab} onValueChange={(v) => setTab(v as "upcoming" | "sent")}>
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="sent">Sent</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {shown.length === 0 ? (
          <EmptyState text="No scheduled messages. Add a trigger to a template to automate comms." />
        ) : (
          shown.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-muted-foreground">{r.when}</span>
                <span className="text-sm">
                  {r.templateName} → {r.guest}
                </span>
                {!r.hasEmail && r.state === "PENDING" ? (
                  <Badge variant="secondary" className="text-warning">will skip (no email)</Badge>
                ) : (
                  <Badge variant="secondary">{r.state.toLowerCase()}</Badge>
                )}
              </div>
              {r.state === "PENDING" ? (
                <Button size="sm" variant="ghost" onClick={() => cancel(r.id)}>Cancel</Button>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>;
}
