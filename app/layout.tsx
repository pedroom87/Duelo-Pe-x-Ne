import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { getCurrentUser } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Duelo Pe X Ne",
  description: "Estatísticas do duelo Pedro x Netu",
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
