"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_OPTIONS,
  type Locale,
  type MessageKey,
  getMessage,
  isLocale,
} from "./messages";

const STORAGE_KEY = "duel-legacy-language";
const LANGUAGE_EVENT = "duel-legacy-language-change";

let currentLocale: Locale = DEFAULT_LOCALE;
const listeners = new Set<() => void>();

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  const storedLocale = window.localStorage.getItem(STORAGE_KEY);
  return isLocale(storedLocale) ? storedLocale : DEFAULT_LOCALE;
}

function emitLanguageChange() {
  listeners.forEach((listener) => listener());
}

function syncLocaleFromStorage() {
  const nextLocale = readStoredLocale();

  if (nextLocale !== currentLocale) {
    currentLocale = nextLocale;
    emitLanguageChange();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  syncLocaleFromStorage();

  function handleStorage(event: StorageEvent) {
    if (event.key === STORAGE_KEY) syncLocaleFromStorage();
  }

  function handleLanguageEvent() {
    syncLocaleFromStorage();
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(LANGUAGE_EVENT, handleLanguageEvent);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(LANGUAGE_EVENT, handleLanguageEvent);
  };
}

function getSnapshot() {
  return currentLocale;
}

function getServerSnapshot() {
  return DEFAULT_LOCALE;
}

export function setLanguage(locale: Locale) {
  currentLocale = locale;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, locale);
    window.dispatchEvent(new Event(LANGUAGE_EVENT));
  }

  emitLanguageChange();
}

export function useLanguage() {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return {
    locale,
    setLocale: setLanguage,
  };
}

export function useI18n() {
  const { locale, setLocale } = useLanguage();

  return {
    locale,
    locales: LOCALE_OPTIONS,
    setLocale,
    t: (key: MessageKey) => getMessage(locale, key),
  };
}

type LanguageSelectorProps = {
  className?: string;
};

export function LanguageSelector({ className = "" }: LanguageSelectorProps) {
  const { locale, locales, setLocale, t } = useI18n();

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
        {t("language.label")}
      </span>
      <div
        aria-label={t("language.select")}
        className="inline-flex rounded-full border border-zinc-800 bg-zinc-950 p-1"
      >
        {locales.map((option) => {
          const selected = option.locale === locale;

          return (
            <button
              key={option.locale}
              type="button"
              onClick={() => setLocale(option.locale)}
              className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
                selected
                  ? "bg-zinc-100 text-zinc-950"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }`}
              aria-pressed={selected}
              title={option.label}
            >
              {option.shortLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}
