import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Duelo Pe X Ne",
  description: "Estatísticas do duelo Pedro x Netu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="flex min-h-screen bg-zinc-950">
          <Sidebar />
          <div className="flex-1">{children}</div>
        </div>
        <Analytics />
      </body>
    </html>
  );
}