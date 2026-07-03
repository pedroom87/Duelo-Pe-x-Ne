import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { getCurrentUser } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Duel Legacy",
  description: "Every Rivalry Deserves a Legacy — Duelo Pe × Ne",
};


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await getCurrentUser();

  return (
    <html lang="pt-BR">
      <body>
        <AppShell initialEmail={currentUser?.email ?? null}>{children}</AppShell>
      </body>
    </html>
  );
}
