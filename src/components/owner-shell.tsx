"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import {
  CalendarDays,
  LayoutDashboard,
  BookMarked,
  Mail,
  CheckSquare,
  Settings,
  RefreshCw,
  Menu,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { syncNow } from "@/actions/settings";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/bookings", label: "Bookings", icon: BookMarked },
  { href: "/messages", label: "Messages", icon: Mail },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-l-2 border-primary bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function OwnerShell({
  children,
  propertyName,
  userEmail,
  lastSyncLabel,
  syncError,
}: {
  children: React.ReactNode;
  propertyName: string;
  userEmail: string;
  lastSyncLabel: string;
  syncError: string | null;
}) {
  const router = useRouter();
  const [syncing, setSyncing] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await syncNow();
      if (res.ok) toast.success(`Synced: ${res.created} new, ${res.updated} updated, ${res.cancelled} cancelled`);
      else toast.error(`Sync failed: ${res.error ?? "unknown"}`);
    } catch {
      toast.error("Sync failed.");
    } finally {
      setSyncing(false);
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-14 items-center gap-2 px-5 text-primary">
          <span className="text-lg">◆</span>
          <span className="font-semibold tracking-tight text-foreground">NestRest</span>
        </div>
        <div className="flex-1 px-3 py-2">
          <NavLinks />
        </div>
        <div className="border-t border-border p-3 text-xs text-muted-foreground">
          <div className="mb-2 flex items-center gap-1.5">
            <RefreshCw className="h-3 w-3" aria-hidden /> {lastSyncLabel}
          </div>
          <div className="flex items-center gap-2">
            <Avatar initials={userEmail.slice(0, 2).toUpperCase()} />
            <span className="truncate">{userEmail}</span>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-border px-4 md:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <SheetTitle className="mb-4">NestRest</SheetTitle>
              <NavLinks onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <span className="text-sm font-medium">{propertyName}</span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant={syncError ? "outline" : "ghost"}
              size="sm"
              onClick={handleSync}
              loading={syncing}
              className={cn(syncError && "border-warning/50 text-warning")}
            >
              {!syncing && <RefreshCw className="h-4 w-4" aria-hidden />}
              Sync now
            </Button>
            <Button variant="ghost" size="icon" aria-label="Sign out" onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
