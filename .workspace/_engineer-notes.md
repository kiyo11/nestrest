# Engineer notes (for Architect)

## Deviations from the plan (all intentional, none change the locked stack)

1. **Repo layout.** The plan's tree shows `apps/web/...`, but the repo arrived as a
   stale, unrelated pnpm/turbo monorepo (Stripe + Supabase + Express) and the task
   brief said to use the `src/` convention at repo root (where the UI skeletons
   live). I scaffolded a single Next.js app at the **repo root** with `src/`.
   The stale `apps/`, `packages/`, `turbo.json`, `pnpm-workspace.yaml` are left on
   disk but untracked/unused (removal was blocked by the sandbox; npm ignores them
   because `package.json` has no `workspaces` field). Recommend deleting them.

2. **Auth session strategy = JWT, not DB sessions.** The plan said DB sessions, but
   Auth.js v5 cannot combine the Credentials provider (needed for the helper
   password path) with the database session strategy. JWT keeps magic-link +
   credentials + optional Google all working; the Prisma adapter still stores
   users/accounts/verification tokens. Role is carried in the JWT/session callback.

3. **`forbidden()` -> `redirect()`.** `next/navigation`'s `forbidden()` needs the
   experimental `authInterrupts` flag in Next 15. `requireRole` redirects instead
   (unauth -> `/login`, wrong role -> their own home) to stay on stable APIs.

4. **Password hashing = bcryptjs, not argon2.** Avoids a native build dependency on
   serverless; the plan explicitly allowed "argon2/bcrypt".

5. **React Email templates deferred.** `mailer`/`dispatch` send HTML strings built
   from `MessageTemplate` rows (which is what the merge engine renders). The
   `emails/*.tsx` React Email components were not built — templates are data-driven
   and owner-editable in the UI, so static components added little for v1.

6. **Password-based helper invite** instead of invite-token + set-password screen.
   Owner creates the helper account with a temporary password in Settings. The
   `/invite/[token]` flow is deferred (noted in summary).

## New dependencies added (all standard for the locked stack)
next, react 19, @prisma/client/prisma, next-auth v5, @auth/prisma-adapter, resend,
@react-email/components, zod, @tanstack/react-query + react-table, luxon, node-ical,
bcryptjs, tailwindcss + radix primitives + lucide + sonner + cva/clsx/tailwind-merge.
No non-obvious or unusual packages.
