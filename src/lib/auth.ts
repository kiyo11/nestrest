import NextAuth, { type DefaultSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { Provider } from "next-auth/providers";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { sendMagicLink } from "./services/mailer";

type AppRole = "OWNER" | "HELPER";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: AppRole } & DefaultSession["user"];
  }
  interface User {
    role?: AppRole;
  }
}

// Custom email (magic-link) provider: logs the link in dev, sends via Resend in prod.
const magicLink: Provider = {
  id: "email",
  type: "email",
  name: "Email",
  from: process.env.EMAIL_FROM ?? "NestRest <onboarding@resend.dev>",
  maxAge: 24 * 60 * 60,
  async sendVerificationRequest({ identifier, url }: { identifier: string; url: string }) {
    await sendMagicLink(identifier, url);
  },
};

const providers: Provider[] = [
  magicLink,
  Credentials({
    name: "Password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(creds) {
      const email = String(creds?.email ?? "").toLowerCase();
      const password = String(creds?.password ?? "");
      if (!email || !password) return null;
      const user = await db.user.findUnique({ where: { email } });
      if (!user?.passwordHash) return null;
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return null;
      return { id: user.id, email: user.email, name: user.name, role: user.role };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(Google);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.uid = user.id;
        token.role = (user.role as AppRole) ?? "OWNER";
      } else if (token.uid && !token.role) {
        const db_user = await db.user.findUnique({ where: { id: token.uid as string } });
        token.role = (db_user?.role as AppRole) ?? "OWNER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.role = (token.role as AppRole) ?? "OWNER";
      }
      return session;
    },
  },
});
