"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { editBooking } from "@/actions/bookings";

export interface BookingEditValues {
  bookingId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  payout: string;
  ownerNotes: string;
}

export function BookingEditForm({ initial }: { initial: BookingEditValues }) {
  const router = useRouter();
  const [v, setV] = React.useState(initial);
  const [loading, setLoading] = React.useState(false);
  const set = (k: keyof BookingEditValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setV((p) => ({ ...p, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await editBooking({
        bookingId: v.bookingId,
        firstName: v.firstName,
        lastName: v.lastName,
        email: v.email,
        phone: v.phone,
        payout: v.payout ? Number(v.payout) : undefined,
        ownerNotes: v.ownerNotes,
      });
      toast.success("Booking saved. Edits are protected from Airbnb sync.");
      router.refresh();
    } catch {
      toast.error("Couldn't save — try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" value={v.firstName} onChange={set("firstName")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" value={v.lastName} onChange={set("lastName")} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={v.email} onChange={set("email")} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" value={v.phone} onChange={set("phone")} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="payout">Payout (USD)</Label>
        <Input id="payout" type="number" step="0.01" value={v.payout} onChange={set("payout")} className="font-mono" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ownerNotes">Notes</Label>
        <Textarea id="ownerNotes" value={v.ownerNotes} onChange={set("ownerNotes")} />
      </div>
      <Button type="submit" loading={loading} className="self-start">
        Save changes
      </Button>
    </form>
  );
}
