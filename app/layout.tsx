import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";

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
          <div className="hidden lg:block">
            <Sidebar />
          </div>
          <div className="flex-1 pb-20 lg:pb-0">{children}</div>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}