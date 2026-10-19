"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { LogIn, ShieldCheck } from "lucide-react";
import { useI18n } from "@/components/i18n";
import { ToyButton } from "@/components/kv/kit";
import { AuthFrame, Field } from "@/components/kv/auth";

export default function ParentLogin() {
  const { tr } = useI18n();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await signIn("credentials", { identifier: identifier.trim(), password, role: "parent", redirect: false });
    setBusy(false);
    if (!res || res.error) {
      setError(tr("That email and password don't match a parent account.", "البريد وكلمة المرور لا يطابقان حساب والدين."));
      return;
    }
    toast.success(tr("Welcome back", "أهلًا بعودتك"));
    router.replace("/parent/dashboard");
    router.refresh();
  };

  return (
    <AuthFrame
      role="parent"
      title={tr("Parent sign in", "دخول الوالدين")}
      sub={tr("Your family's requests are waiting.", "طلبات عائلتك بانتظارك.")}
      art={<div className="flex flex-col gap-4"><ShieldCheck className="h-20 w-20" /><p className="font-display text-4xl font-extrabold leading-tight">{tr("Every idea passes through you.", "كل فكرة تمرّ من خلالك.")}</p></div>}
      footer={<>{tr("No account yet?", "ليس لديك حساب؟")} <Link href="/parent/register" className="text-primary underline underline-offset-4" data-testid="link-register">{tr("Create a family", "أنشئ عائلة")}</Link></>}
    >
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label={tr("Email", "البريد الإلكتروني")} htmlFor="email">
          <input id="email" type="email" autoComplete="email" required className="toy-input" value={identifier} onChange={(e) => setIdentifier(e.target.value)} data-testid="input-email" />
        </Field>
        <Field label={tr("Password", "كلمة المرور")} htmlFor="password">
          <input id="password" type="password" autoComplete="current-password" required className="toy-input" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="input-password" />
        </Field>
        {error && <p role="alert" className="rounded-2xl bg-destructive/12 p-3 text-sm font-bold text-destructive" data-testid="text-login-error">{error}</p>}
        <ToyButton type="submit" size="lg" disabled={busy || !identifier || !password} data-testid="button-login">
          <LogIn className="h-5 w-5 rtl:-scale-x-100" /> {busy ? tr("Signing in...", "جارٍ الدخول...") : tr("Sign in", "دخول")}
        </ToyButton>
        <Link href="/kid/login" className="text-center text-sm font-bold text-muted-foreground hover:text-foreground" data-testid="link-kid-login">{tr("Are you a kid? Use the explorer door", "هل أنت طفل؟ استخدم باب المستكشف")}</Link>
      </form>
    </AuthFrame>
  );
}
