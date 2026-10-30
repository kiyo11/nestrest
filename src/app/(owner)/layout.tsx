import { OwnerShell } from "@/components/owner-shell";
import { getOwnerContext } from "@/lib/context";

function relative(date: Date | null): string {
  if (!date) return "never synced";
  const mins = Math.round((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "last sync just now";
  if (mins < 60) return `last sync ${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `last sync ${hrs}h ago`;
  return `last sync ${Math.round(hrs / 24)}d ago`;
}

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const { user, property } = await getOwnerContext();
  return (
    <OwnerShell
      propertyName={property.name}
      userEmail={user.email}
      lastSyncLabel={relative(property.lastSyncAt)}
      syncError={property.lastSyncError}
    >
      {children}
    </OwnerShell>
  );
}
