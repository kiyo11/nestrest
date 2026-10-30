"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSettings, inviteHelper } from "@/actions/settings";

interface Settings {
  name: string;
  address: string;
  timezone: string;
  icalUrl: string;
  wifiInfo: string;
  doorCode: string;
}

export function SettingsClient({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [v, setV] = React.useState(initial);
  const [saving, setSaving] = React.useState(false);
  const set = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setV((p) => ({ ...p, [k]: e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings(v);
      toast.success("Settings saved.");
      router.refresh();
    } catch {
      toast.error("Could not save settings. Check the iCal URL format.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Property</CardTitle>
          <CardDescription>iCal URL, door code and WiFi are encrypted at rest.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="flex flex-col gap-3">
            <Field label="Name"><Input value={v.name} onChange={set("name")} /></Field>
            <Field label="Address (shown to helpers)"><Input value={v.address} onChange={set("address")} /></Field>
            <Field label="Timezone (IANA)"><Input value={v.timezone} onChange={set("timezone")} /></Field>
            <Field label="Airbnb iCal URL"><Input value={v.icalUrl} onChange={set("icalUrl")} placeholder="https://www.airbnb.com/calendar/ical/...ics" /></Field>
            <Field label="WiFi info"><Input value={v.wifiInfo} onChange={set("wifiInfo")} /></Field>
            <Field label="Door code"><Input value={v.doorCode} onChange={set("doorCode")} className="font-mono" /></Field>
            <Button type="submit" loading={saving} className="self-start">Save settings</Button>
          </form>
        </CardContent>
      </Card>

      <InviteCard />
    </div>
  );
}

function InviteCard() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await inviteHelper({ email, name, password });
      toast.success("Helper added. Share the password securely.");
      setEmail("");
      setName("");
      setPassword("");
      router.refresh();
    } catch {
      toast.error("Could not add helper (password needs 8+ chars).");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Invite a helper</CardTitle>
        <CardDescription>Helpers see only their assigned tasks — never payouts or guest PII.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
          <Field label="Temporary password"><Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} /></Field>
          <Button type="submit" variant="secondary" loading={loading} className="self-start">Add helper</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
