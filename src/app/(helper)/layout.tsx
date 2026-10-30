import { signOut } from "@/lib/auth";
import { requireRole } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { LogOut } from "lucide-react";

export default async function HelperLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["HELPER", "OWNER"]);
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      <header className="flex h-13 items-center gap-2 border-b border-border px-4 py-2.5">
        <span className="text-primary">◆</span>
        <span className="font-semibold tracking-tight">NestRest</span>
        <div className="ml-auto flex items-center gap-2">
          <Avatar initials={user.email.slice(0, 2).toUpperCase()} />
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button type="submit" variant="ghost" size="icon" aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </header>
      <main className="flex-1 px-4 py-4">{children}</main>
    </div>
  );
}
