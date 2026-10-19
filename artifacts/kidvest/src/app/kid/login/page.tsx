"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Compass, Rocket } from "lucide-react";
import { useI18n } from "@/components/i18n";
import { ToyButton } from "@/components/kv/kit";
import { AuthFrame, Field } from "@/components/kv/auth";

export default function KidLogin() {
  const { tr } = useI18n();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await signIn("credentials", { identifier: identifier.trim(), password, role: "kid", redirect: false });
    setBusy(false);
    if (!res || res.error) {
      setError(tr("Hmm, that didn't work. Check your username and secret password, or ask your parent.", "لم ينجح ذلك. تحقق من اسم المستخدم وكلمة السر، أو اسأل والديك."));
      return;
    }
    toast.success(tr("Adventure unlocked", "فُتحت المغامرة"));
    router.replace("/kid/dashboard");
    router.refresh();
  };

  return (
    <AuthFrame
      role="kid"
      title={tr("Explorer login", "دخول المستكشف")}
      sub={tr("Ready to discover some companies?", "مستعد لاكتشاف بعض الشركات؟")}
      art={<div className="flex flex-col gap-4"><Rocket className="h-20 w-20 -rotate-12" /><p className="font-display text-4xl font-extrabold leading-tight">{tr("Find a company you love. Ask. Learn.", "اعثر على شركة تحبها. اطلب. تعلّم.")}</p></div>}
      footer={<>{tr("Parent?", "والد؟")} <Link href="/parent/login" className="text-primary underline underline-offset-4" data-testid="link-parent-login">{tr("Use the parent door", "استخدم باب الوالدين")}</Link></>}
    >
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label={tr("Username", "اسم المستخدم")} htmlFor="username" hint={tr("Your parent created this for you.", "أنشأه والداك لك.")}>
          <input id="username" autoComplete="username" autoCapitalize="none" className="toy-input" value={identifier} onChange={(e) => setIdentifier(e.target.value)} data-testid="input-username" />
        </Field>
        <Field label={tr("Secret password", "كلمة السر")} htmlFor="password">
          <input id="password" type="password" autoComplete="current-password" className="toy-input" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="input-password" />
        </Field>
        {error && <p role="alert" className="rounded-2xl bg-destructive/12 p-3 text-sm font-bold text-destructive" data-testid="text-login-error">{error}</p>}
        <ToyButton type="submit" variant="secondary" size="lg" disabled={busy || !identifier || !password} data-testid="button-login">
          <Compass className="h-5 w-5" /> {busy ? tr("Opening map...", "نفتح الخريطة...") : tr("Let's go", "هيا بنا")}
        </ToyButton>
      </form>
    </AuthFrame>
  );
}
