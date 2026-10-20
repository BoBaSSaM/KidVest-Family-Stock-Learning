"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { formatUsd } from "@/lib/formatting";

export type Lang = "en" | "ar";

type Ctx = {
  lang: Lang;
  dir: "ltr" | "rtl";
  setLang: (l: Lang) => void;
  tr: (en: string, ar: string) => string;
  money: (n: number | undefined | null) => string;
  num: (n: number | undefined | null, digits?: number) => string;
  pct: (n: number | undefined | null) => string;
  date: (s: string | undefined) => string;
  dateTime: (s: string | undefined) => string;
};

const I18nCtx = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");

  useEffect(() => {
    const saved = window.localStorage.getItem("kv-lang");
    if (saved === "ar" || saved === "en") setLangState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem("kv-lang", l);
  }, []);

  const value = useMemo<Ctx>(() => {
    const locale = lang === "ar" ? "ar-EG-u-nu-latn" : "en-US";
    return {
      lang,
      dir: lang === "ar" ? "rtl" : "ltr",
      setLang,
      tr: (en, ar) => (lang === "ar" ? ar : en),
      money: formatUsd,
      num: (n, digits = 2) =>
        new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(Number.isFinite(n as number) ? (n as number) : 0),
      pct: (n) => {
        const v = Number.isFinite(n as number) ? (n as number) : 0;
        return `${v > 0 ? "+" : ""}${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(v)}%`;
      },
      date: (s) => (s ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(s)) : ""),
      dateTime: (s) =>
        s ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(s)) : "",
    };
  }, [lang, setLang]);

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const c = useContext(I18nCtx);
  if (!c) throw new Error("useI18n must be inside I18nProvider");
  return c;
}
