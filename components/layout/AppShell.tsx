"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/auth/browser";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";

type AppShellProps = {
  children: ReactNode;
  initialEmail: string | null;
};

export function AppShell({ children, initialEmail }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState(initialEmail);
  const isLoginRoute = pathname === "/login";

  useEffect(() => {
    if (isLoginRoute) return;

    const supabase = getSupabaseBrowserClient();
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setUserEmail(data.user?.email ?? null);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null);

      if (!session) {
        router.replace("/login");
        router.refresh();
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [isLoginRoute, router]);

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setUserEmail(null);
    router.replace("/login");
    router.refresh();
  }

  if (isLoginRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="flex min-h-screen bg-zinc-950">
        <div className="hidden lg:block">
          <Sidebar userEmail={userEmail} onSignOut={handleSignOut} />
        </div>
        <div className="flex-1 pb-28 lg:pb-0">{children}</div>
      </div>
      <BottomNav userEmail={userEmail} onSignOut={handleSignOut} />
    </>
  );
}
