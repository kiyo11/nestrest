import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4">
      <div className="mb-6 flex items-center gap-2 text-primary">
        <span className="text-xl">◆</span>
        <span className="text-lg font-semibold tracking-tight text-foreground">NestRest</span>
      </div>
      <LoginForm />
      <p className="mt-6 text-xs text-muted-foreground">Self-hosted · v1</p>
    </div>
  );
}
