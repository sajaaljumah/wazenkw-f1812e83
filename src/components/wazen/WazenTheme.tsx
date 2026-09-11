import { useEffect } from "react";
import { useProfile, useSession } from "@/hooks/use-wazen-auth";

export type WazenTheme = "light" | "dark" | "system";

const STORAGE_PREFIX = "wazen-theme:";

function resolve(theme: string | null | undefined): "light" | "dark" {
  if (theme === "dark") return "dark";
  if (theme === "system") {
    return typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "light";
}

/** Applies the resolved theme to the document root. Safe to call repeatedly. */
export function applyTheme(theme: string | null | undefined) {
  if (typeof document === "undefined") return;
  const resolved = resolve(theme);
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

export function cacheTheme(userId: string, theme: string) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${userId}`, theme);
  } catch {
    /* storage unavailable */
  }
}

function readCachedTheme(userId: string): string | null {
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
  } catch {
    return null;
  }
}

/**
 * Single source of truth for the active theme.
 * The preference belongs to the signed-in account: it is read from that
 * account's profile row, cached under an account-scoped key to avoid a flash on
 * reload, and reset to light whenever nobody is signed in — so one demo account
 * never inherits another account's theme.
 */
export function ThemeSync() {
  const { user, loading } = useSession();
  const { data: profile } = useProfile();
  const userId = user?.id ?? null;
  const profileTheme = profile?.theme ?? null;

  useEffect(() => {
    if (loading) return;
    if (!userId) {
      applyTheme("light");
      return;
    }
    applyTheme(readCachedTheme(userId) ?? "light");
  }, [userId, loading]);

  useEffect(() => {
    if (!userId || !profileTheme) return;
    cacheTheme(userId, profileTheme);
    applyTheme(profileTheme);
  }, [userId, profileTheme]);

  // Follow the device when the account opted into "system".
  useEffect(() => {
    if (profileTheme !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [profileTheme]);

  return null;
}
