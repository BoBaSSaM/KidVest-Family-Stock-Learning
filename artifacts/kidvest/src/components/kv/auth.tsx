"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useStartDemo } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n";
import { Disclaimer, LangToggle, Logo, ThemeToggle, ToyButton, errMsg } from "@/components/kv/kit";

export function useDemoLaunch() {
  const router = useRouter();
  const { tr } = useI18n();
  const start = useStartDemo();
  const [pending, setPending] = useState<"parent" | "kid" | null>(null);
  const launch = async (role: "parent" | "kid") => {
    setPending(role);
    try {
      let demoKey = window.sessionStorage.getItem("kv-demo-key");
      let res = demoKey ? await signIn("credentials", { demoKey, role, redirect: false }) : undefined;
      if (!res || res.error) {
        const generatedDemoKey = (await start.mutateAsync()).demoKey;
        if (!generatedDemoKey) throw new Error("Demo sign-in key was not returned.");
        demoKey = generatedDemoKey;
        window.sessionStorage.setItem("kv-demo-key", demoKey);
        res = await signIn("credentials", { demoKey, role, redirect: false });
      }
      if (!res || res.error) throw new Error(res?.error ?? "Sign-in failed");
      toast.success(tr("Demo family ready. Everything here is sample data.", "العائلة التجريبية جاهزة. كل شيء هنا بيانات تجريبية."));
      router.replace(`/${role}/dashboard`);
      router.refresh();
    } catch (e) {
      toast.error(tr("Could not start the demo", "تعذّر بدء العرض التجريبي"), { description: errMsg(e) });
      setPending(null);
    }
  };
  return { launch, pending };
}

export function DemoButton({ role, className, size = "md", testId }: { role: "parent" | "kid"; className?: string; size?: "md" | "lg" | "sm"; testId?: string }) {
  const { launch, pending } = useDemoLaunch();
  const { tr } = useI18n();
  return (
    <ToyButton
      variant="accent"
      size={size}
      className={className}
      disabled={pending !== null}
      onClick={() => launch(role)}
      data-testid={testId ?? `button-demo-${role}`}
    >
      <Sparkles className="h-5 w-5" />
      {pending === role
        ? tr("Building demo family...", "نجهّز العائلة التجريبية...")
        : role === "parent"
          ? tr("Try Parent View", "جرّب عرض الوالدين")
          : tr("Try Kid View", "جرّب عرض الطفل")}
    </ToyButton>
  );
}

export function AuthFrame({
  role, title, sub, children, footer, art,
}: { role: "parent" | "kid"; title: string; sub: string; children: ReactNode; footer?: ReactNode; art: ReactNode }) {
  const { tr } = useI18n();
  return (
    <div className="min-h-[100dvh] p-4 md:p-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/" data-testid="link-landing" className="flex items-center gap-2 font-extrabold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> <span className="hidden sm:inline">{tr("Back", "رجوع")}</span>
          <Logo className="ms-2" />
        </Link>
        <div className="flex gap-2"><LangToggle /><ThemeToggle /></div>
      </div>
      <div className="mx-auto mt-8 grid max-w-6xl items-stretch gap-6 md:grid-cols-[1.05fr_1fr]">
        <div className={cn("kv-rise relative hidden overflow-hidden rounded-[2.25rem] p-10 md:flex md:flex-col md:justify-between", role === "parent" ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground")}>
          <div className="absolute -end-16 -top-16 h-64 w-64 rounded-full bg-white/10" />
          <div className="absolute -bottom-24 -start-10 h-72 w-72 rounded-full bg-black/5" />
          <p className="relative text-xs font-black uppercase tracking-[0.2em] opacity-80">{role === "parent" ? tr("For grown-ups", "للكبار") : tr("For explorers 7-12", "للمستكشفين ٧-١٢")}</p>
          <div className="relative">{art}</div>
          <Disclaimer className="relative !text-current opacity-80" />
        </div>
        <div className="toy-card kv-rise flex flex-col gap-6 p-6 md:p-10" style={{ animationDelay: "80ms" }}>
          <div>
            <h1 className="font-display text-3xl font-extrabold md:text-4xl">{title}</h1>
            <p className="mt-1 font-semibold text-muted-foreground">{sub}</p>
          </div>
          {children}
          <div className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-muted-foreground">
            <span className="h-0.5 flex-1 bg-border" /> {tr("or explore first", "أو استكشف أولًا")} <span className="h-0.5 flex-1 bg-border" />
          </div>
          <DemoButton role={role} className="w-full" />
          {footer && <div className="text-center text-sm font-bold text-muted-foreground">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export function Field({ label, htmlFor, children, hint }: { label: string; htmlFor: string; children: ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-extrabold">{label}</label>
      {children}
      {hint && <span className="text-xs font-bold text-muted-foreground">{hint}</span>}
    </div>
  );
}
