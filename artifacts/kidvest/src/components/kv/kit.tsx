"use client";
import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { useTheme } from "next-themes";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, Flame, Fish, Grape, Languages, Moon, RotateCcw, Rocket, Sprout, Sun, SunMedium,
} from "lucide-react";
import {
  getGetActivityQueryKey, getGetDashboardQueryKey, getGetKidsQueryKey, getGetPaymentsQueryKey,
  getGetPortfolioQueryKey, getGetRequestsQueryKey,
} from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n";

export type Variant = "primary" | "secondary" | "accent" | "danger" | "ghost" | "outline";
export type Size = "sm" | "md" | "lg";

export function toyBtn(v: Variant = "primary", s: Size = "md") {
  return cn(
    "toy-btn",
    `toy-${v}`,
    s === "sm" ? "h-9 px-3.5 text-sm rounded-xl" : s === "lg" ? "h-14 px-7 text-lg rounded-2xl" : "h-11 px-5 text-[15px] rounded-2xl",
  );
}

export function ToyButton({
  variant = "primary", size = "md", className, type = "button", ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={cn(toyBtn(variant, size), className)} {...rest} />;
}

export function ToyLink({
  variant = "primary", size = "md", className, ...rest
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={cn(toyBtn(variant, size), className)} {...rest} />;
}

export function Panel({ className, children, ...rest }: ComponentProps<"section">) {
  return (
    <section className={cn("toy-card p-5 md:p-6", className)} {...rest}>
      {children}
    </section>
  );
}

export function PageHeader({
  eyebrow, title, sub, actions,
}: { eyebrow?: string; title: string; sub?: string; actions?: ReactNode }) {
  return (
    <header className="kv-rise mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-black uppercase tracking-[0.18em] text-primary">{eyebrow}</p>}
        <h1 className="font-display text-3xl font-extrabold leading-tight md:text-[2.5rem]">{title}</h1>
        {sub && <p className="mt-1 max-w-2xl font-semibold text-muted-foreground">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </header>
  );
}

const tones = {
  primary: "bg-primary/12 text-primary",
  secondary: "bg-secondary/15 text-secondary",
  accent: "bg-accent/30 text-accent-foreground dark:text-accent",
  danger: "bg-destructive/12 text-destructive",
  muted: "bg-muted text-muted-foreground",
} as const;
export type Tone = keyof typeof tones;

export function Chip({ tone = "muted", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return <span className={cn("toy-chip", tones[tone], className)}>{children}</span>;
}

export function StatTile({
  label, value, icon, tone = "primary", hint, testId,
}: { label: string; value: ReactNode; icon: ReactNode; tone?: Tone; hint?: ReactNode; testId?: string }) {
  return (
    <div className="toy-card kv-rise flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-extrabold text-muted-foreground">{label}</span>
        <span className={cn("grid h-10 w-10 place-items-center rounded-2xl", tones[tone])}>{icon}</span>
      </div>
      <div data-testid={testId} className="font-num text-2xl font-bold md:text-[1.7rem]">{value}</div>
      {hint && <div className="text-xs font-bold text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function Skel({ className }: { className?: string }) {
  return <div aria-hidden className={cn("kv-skel", className)} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <Skel className="h-10 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skel key={i} className="h-32 rounded-[1.75rem]" />)}
      </div>
      <Skel className="h-72 rounded-[1.75rem]" />
    </div>
  );
}

export function EmptyState({
  icon, title, body, action, className,
}: { icon: ReactNode; title: string; body?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-[1.75rem] border-2 border-dashed border-border px-6 py-12 text-center", className)}>
      <div className="kv-pop grid h-16 w-16 rotate-[-6deg] place-items-center rounded-3xl bg-accent text-accent-foreground shadow-[0_5px_0_hsl(var(--accent-deep))]">
        {icon}
      </div>
      <h3 className="font-display text-xl font-extrabold">{title}</h3>
      {body && <p className="max-w-sm text-sm font-semibold text-muted-foreground">{body}</p>}
      {action}
    </div>
  );
}

export function errMsg(e: unknown, fallback = "Something went wrong"): string {
  const d = (e as { data?: unknown })?.data;
  if (d && typeof d === "object") {
    const o = d as Record<string, unknown>;
    for (const k of ["error", "message", "detail"]) if (typeof o[k] === "string") return o[k] as string;
  }
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { tr } = useI18n();
  return (
    <div role="alert" className="toy-card flex flex-col items-center gap-3 border-destructive/40 p-8 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-destructive/12 text-destructive">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h3 className="font-display text-xl font-extrabold">{tr("This page tripped over a block", "تعثّرت هذه الصفحة")}</h3>
      <p className="max-w-md text-sm font-semibold text-muted-foreground">{errMsg(error)}</p>
      {onRetry && (
        <ToyButton variant="outline" size="sm" onClick={onRetry} data-testid="button-retry">
          <RotateCcw className="h-4 w-4" /> {tr("Try again", "حاول مجددًا")}
        </ToyButton>
      )}
    </div>
  );
}

export const AVATARS = [
  { key: "comet", icon: Rocket, bg: "bg-primary", fg: "text-primary-foreground", ar: "مذنّب", en: "Comet" },
  { key: "reef", icon: Fish, bg: "bg-[hsl(190_70%_45%)]", fg: "text-white", ar: "شعاب", en: "Reef" },
  { key: "sprout", icon: Sprout, bg: "bg-secondary", fg: "text-secondary-foreground", ar: "برعم", en: "Sprout" },
  { key: "ember", icon: Flame, bg: "bg-destructive", fg: "text-destructive-foreground", ar: "جمرة", en: "Ember" },
  { key: "grape", icon: Grape, bg: "bg-[hsl(268_58%_58%)]", fg: "text-white", ar: "عنب", en: "Grape" },
  { key: "sunny", icon: SunMedium, bg: "bg-accent", fg: "text-accent-foreground", ar: "مشمس", en: "Sunny" },
] as const;

export function KvAvatar({ avatar, name, size = 40 }: { avatar?: string; name?: string; size?: number }) {
  const a = AVATARS.find((x) => x.key === avatar);
  if (avatar && (avatar.startsWith("http") || avatar.startsWith("/"))) {
    return <img src={avatar} alt={name ?? ""} width={size} height={size} className="rounded-2xl object-cover" style={{ width: size, height: size }} />;
  }
  if (a) {
    const Icon = a.icon;
    return (
      <span aria-label={name} className={cn("inline-grid shrink-0 place-items-center rounded-2xl", a.bg, a.fg)} style={{ width: size, height: size }}>
        <Icon style={{ width: size * 0.5, height: size * 0.5 }} />
      </span>
    );
  }
  const initials = (name ?? "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span aria-label={name} className="inline-grid shrink-0 place-items-center rounded-2xl bg-primary/15 font-black text-primary" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials}
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="relative grid h-10 w-10 rotate-[-8deg] place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_4px_0_hsl(var(--primary-deep))]">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 17l5-5 4 3 7-8" />
          <path d="M15 7h5v5" />
        </svg>
        <span className="absolute -end-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-card bg-accent" />
      </span>
      <span dir="rtl" className="font-display whitespace-nowrap text-2xl font-extrabold">
        العب و <span className="text-primary">اكسب</span>
      </span>
    </span>
  );
}

export function LangToggle({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <button
      type="button"
      onClick={() => setLang(lang === "ar" ? "en" : "ar")}
      className={cn(toyBtn("outline", "sm"), "gap-1.5", className)}
      aria-label={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}
      data-testid="button-toggle-language"
    >
      <Languages className="h-4 w-4" />
      {lang === "ar" ? "EN" : "عربي"}
    </button>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const { tr } = useI18n();
  const dark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      className={cn(toyBtn("outline", "sm"), "w-9 px-0", className)}
      aria-label={dark ? tr("Switch to light mode", "الوضع الفاتح") : tr("Switch to dark mode", "الوضع الداكن")}
      data-testid="button-toggle-theme"
    >
      <Sun className="hidden h-4 w-4 dark:block" />
      <Moon className="h-4 w-4 dark:hidden" />
    </button>
  );
}

export function Disclaimer({ className }: { className?: string }) {
  const { tr } = useI18n();
  return (
    <p className={cn("text-xs font-bold text-muted-foreground", className)}>
      {tr(
        "Educational use only. Not financial advice. العب و اكسب is not a brokerage; investments are virtual and returns are never guaranteed.",
        "للاستخدام التعليمي فقط. ليست نصيحة مالية. «العب و اكسب» ليست شركة وساطة؛ الاستثمارات افتراضية والعوائد غير مضمونة أبدًا.",
      )}
    </p>
  );
}

export function SignedMoney({ value, className }: { value: number; className?: string }) {
  const { money } = useI18n();
  return (
    <span className={cn("font-num font-bold", value > 0 ? "text-secondary" : value < 0 ? "text-destructive" : "text-muted-foreground", className)}>
      {value > 0 ? "+" : ""}{money(value)}
    </span>
  );
}

export function SourceChip({ source }: { source?: string }) {
  const { tr } = useI18n();
  if (source === "demo") return <Chip tone="accent">{tr("Demo sample price (dated)", "سعر تجريبي مؤرخ")}</Chip>;
  if (source === "live") return <Chip tone="secondary">{tr("Market data", "بيانات السوق")}</Chip>;
  return null;
}

export function invalidateFamily(qc: QueryClient) {
  for (const key of [
    getGetDashboardQueryKey(), getGetKidsQueryKey(), getGetRequestsQueryKey(), getGetPortfolioQueryKey(),
    getGetActivityQueryKey(), getGetPaymentsQueryKey(),
  ]) {
    qc.invalidateQueries({ queryKey: [key[0]] });
  }
}

export function useInvalidateFamily() {
  const qc = useQueryClient();
  return () => invalidateFamily(qc);
}

export type KvUser = { id: string; name: string; role: "parent" | "kid"; avatar: string; isDemo: boolean };
