import { getOwnerContext } from "@/lib/context";
import { decrypt } from "@/lib/crypto";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { property } = await getOwnerContext();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <SettingsClient
        initial={{
          name: property.name,
          address: property.address,
          timezone: property.timezone,
          icalUrl: decrypt(property.icalUrl) ?? "",
          wifiInfo: property.wifiInfo ?? "",
          doorCode: decrypt(property.doorCode) ?? "",
        }}
      />
    </div>
  );
}
