"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/auth/browser";
import { useI18n } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/messages";

export type InitialProfile = {
  email: string;
  displayName: string;
  avatarUrl: string;
  preferredLocale: Locale;
};

type ProfileFormProps = {
  initialProfile: InitialProfile;
};

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "DL";

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function ProfileForm({ initialProfile }: ProfileFormProps) {
  const router = useRouter();
  const { locale, locales, setLocale, t } = useI18n();
  const [displayName, setDisplayName] = useState(initialProfile.displayName);
  const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatarUrl);
  const [preferredLocale, setPreferredLocale] = useState<Locale>(
    initialProfile.preferredLocale
  );
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const trimmedAvatarUrl = avatarUrl.trim();
  const initials = useMemo(
    () => getInitials(displayName || initialProfile.email),
    [displayName, initialProfile.email]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({
      data: {
        display_name: displayName.trim(),
        avatar_url: trimmedAvatarUrl,
        preferred_locale: preferredLocale,
      },
    });

    setSaving(false);

    if (error) {
      setErrorMessage(t("profile.updateError"));
      return;
    }

    if (preferredLocale !== locale) {
      setLocale(preferredLocale);
    }

    setSuccessMessage(t("profile.updateSuccess"));
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6 pb-24 text-white sm:px-8 sm:py-10 sm:pb-0">
      <section className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-zinc-500">
              Duel Legacy
            </p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              {t("profile.myProfile")}
            </h1>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-sm font-bold text-zinc-200 transition hover:border-zinc-500 hover:text-white"
          >
            {t("profile.backToDashboard")}
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl shadow-black/20 sm:p-7"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-950 text-3xl font-black text-zinc-100 ring-4 ring-zinc-800">
              {trimmedAvatarUrl ? (
                <img
                  src={trimmedAvatarUrl}
                  alt={displayName || initialProfile.email}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>

            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">
                {t("profile.email")}
              </p>
              <p className="mt-2 break-words text-lg font-black text-zinc-100">
                {initialProfile.email}
              </p>
              <p className="mt-3 text-sm text-zinc-400">
                {t("profile.avatarFallback")}
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-5">
            <label className="block">
              <span className="text-sm font-bold text-zinc-300">
                {t("profile.displayName")}
              </span>
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-4 text-base text-white outline-none transition focus:border-red-500"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-zinc-300">
                {t("profile.photoUrl")}
              </span>
              <input
                type="url"
                value={avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                placeholder="https://"
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-4 text-base text-white outline-none transition focus:border-green-500"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-zinc-300">
                {t("profile.preferredLocale")}
              </span>
              <select
                value={preferredLocale}
                onChange={(event) =>
                  setPreferredLocale(event.target.value as Locale)
                }
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-4 text-base text-white outline-none transition focus:border-zinc-400"
              >
                {locales.map((option) => (
                  <option key={option.locale} value={option.locale}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {successMessage ? (
            <p className="mt-6 rounded-xl border border-green-800 bg-green-950/30 px-4 py-3 text-sm font-bold text-green-200">
              {successMessage}
            </p>
          ) : null}

          {errorMessage ? (
            <p className="mt-6 rounded-xl border border-red-800 bg-red-950/30 px-4 py-3 text-sm font-bold text-red-200">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="mt-8 w-full rounded-xl bg-red-700 px-6 py-4 text-lg font-black text-white transition hover:bg-red-600 disabled:opacity-50"
          >
            {saving ? t("profile.savingProfile") : t("profile.saveProfile")}
          </button>
        </form>
      </section>
    </main>
  );
}
