"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  canSeeAdministrativeActions,
  getProfileForUserEmail,
  isAuthenticatedProfile,
  USER_PROFILE_LABELS,
  type UserProfile,
} from "@/lib/auth/permissions";

type AccessContextValue = {
  userEmail: string | null;
  profile: UserProfile;
  profileLabel: string;
  isAuthenticated: boolean;
  canManageAdministrativeActions: boolean;
};

const visitorAccess: AccessContextValue = {
  userEmail: null,
  profile: "VISITANTE",
  profileLabel: USER_PROFILE_LABELS.VISITANTE,
  isAuthenticated: false,
  canManageAdministrativeActions: false,
};

const AccessContext = createContext<AccessContextValue>(visitorAccess);

type AccessProviderProps = {
  children: ReactNode;
  userEmail: string | null;
};

export function AccessProvider({ children, userEmail }: AccessProviderProps) {
  const value = useMemo<AccessContextValue>(() => {
    const profile = getProfileForUserEmail(userEmail);

    return {
      userEmail,
      profile,
      profileLabel: USER_PROFILE_LABELS[profile],
      isAuthenticated: isAuthenticatedProfile(profile),
      canManageAdministrativeActions: canSeeAdministrativeActions(profile),
    };
  }, [userEmail]);

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  return useContext(AccessContext);
}
