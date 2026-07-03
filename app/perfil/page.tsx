import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/messages";
import { ProfileForm, type InitialProfile } from "./ProfileForm";

function getStringMetadata(
  metadata: Record<string, unknown>,
  key: string,
  fallback = ""
) {
  const value = metadata[key];

  return typeof value === "string" ? value : fallback;
}

function getPreferredLocale(metadata: Record<string, unknown>): Locale {
  const value = metadata.preferred_locale;

  return typeof value === "string" && isLocale(value) ? value : DEFAULT_LOCALE;
}

export default async function PerfilPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?next=/perfil");
  }

  const metadata = (currentUser.user_metadata ?? {}) as Record<string, unknown>;
  const initialProfile: InitialProfile = {
    email: currentUser.email ?? "",
    displayName: getStringMetadata(metadata, "display_name"),
    avatarUrl: getStringMetadata(metadata, "avatar_url"),
    preferredLocale: getPreferredLocale(metadata),
  };

  return <ProfileForm initialProfile={initialProfile} />;
}
