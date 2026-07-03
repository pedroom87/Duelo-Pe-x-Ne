"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AccessProvider } from "@/components/auth/AccessContext";
import {
  canAccessRoute,
  getProfileForUserEmail,
} from "@/lib/auth/permissions";
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
  const profile = getProfileForUserEmail(userEmail);
  const loginHref =
    pathname && pathname !== "/403"
      ? `/login?next=${encodeURIComponent(pathname)}`
      : "/login";

  useEffect(() => {
    if (isLoginRoute) return;

    const supabase = getSupabaseBrowserClient();
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (active) {
        const nextEmail = data.user?.email ?? null;
        setUserEmail(nextEmail);

        if (!canAccessRoute(getProfileForUserEmail(nextEmail), pathname)) {
          router.replace("/403");
          router.refresh();
        }
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextEmail = session?.user.email ?? null;
      setUserEmail(nextEmail);

      if (!canAccessRoute(getProfileForUserEmail(nextEmail), pathname)) {
        router.replace("/403");
        router.refresh();
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [isLoginRoute, pathname, router]);

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
      <AccessProvider userEmail={userEmail}>
        <div className="flex min-h-screen bg-zinc-950">
          <div className="hidden lg:block">
            <Sidebar
              userEmail={userEmail}
              profile={profile}
              loginHref={loginHref}
              onSignOut={handleSignOut}
            />
          </div>
          <div className="flex-1 pb-28 lg:pb-0">{children}</div>
        </div>
        <BottomNav
          userEmail={userEmail}
          profile={profile}
          loginHref={loginHref}
          onSignOut={handleSignOut}
        />
      </AccessProvider>
    </>
  );
}
