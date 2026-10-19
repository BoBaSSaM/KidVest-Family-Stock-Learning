"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Home, UserPlus } from "lucide-react";
import { useRegisterParent } from "@workspace/api-client-react";
import { useI18n } from "@/components/i18n";
import { ToyButton, errMsg } from "@/components/kv/kit";
import { AuthFrame, Field } from "@/components/kv/auth";

export default function ParentRegister() {
  const { tr } = useI18n();
  const router = useRouter();
  const register = useRegisterParent();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [signing, setSigning] = useState(false);

  const nameOk = name.trim().length >= 2;
  const emailOk = /^\S+@\S+\.\S+$/.test(email);
  const pwOk = password.length >= 8;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!nameOk || !emailOk || !pwOk) return;
    setError("");
    register.mutate(
      { data: { name: name.trim(), email: email.trim(), password } },
      {
        onSuccess: async () => {
          setSigning(true);
          const res = await signIn("credentials", { identifier: email.trim(), password, role: "parent", redirect: false });
          setSigning(false);
          if (!res || res.error) { router.replace("/parent/login"); return; }
          toast.success(tr("Family created. Add your first explorer next.", "أُنشئت العائلة. أضف مستكشفك الأول."));
          router.replace("/parent/kids");
          router.refresh();
        },
        onError: (err) => setError(errMsg(err)),
      },
    );
  };

  const busy = register.isPending || signing;
  return (
    <AuthFrame
      role="parent"
      title={tr("Create your family", "أنشئ عائلتك")}
      sub={tr("One parent account, as many explorers as you need.", "حساب والد واحد، وأي عدد من المستكشفين.")}
      art={<div className="flex flex-col gap-4"><Home className="h-20 w-20" /><p className="font-display text-4xl font-extrabold leading-tight">{tr("Build the family base camp.", "ابنِ معسكر العائلة.")}</p></div>}
      footer={<>{tr("Already have an account?", "لديك حساب؟")} <Link href="/parent/login" className="text-primary underline underline-offset-4" data-testid="link-login">{tr("Sign in", "دخول")}</Link></>}
    >
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label={tr("Your name", "اسمك")} htmlFor="name">
          <input id="name" className="toy-input" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} data-testid="input-name" />
        </Field>
        <Field label={tr("Email", "البريد الإلكتروني")} htmlFor="email">
          <input id="email" type="email" autoComplete="email" className="toy-input" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="input-email" />
        </Field>
        <Field label={tr("Password", "كلمة المرور")} htmlFor="password" hint={tr("At least 8 characters.", "٨ أحرف على الأقل.")}>
          <input id="password" type="password" autoComplete="new-password" className="toy-input" maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} data-testid="input-password" />
        </Field>
        {error && <p role="alert" className="rounded-2xl bg-destructive/12 p-3 text-sm font-bold text-destructive">{error}</p>}
        <ToyButton type="submit" size="lg" disabled={busy || !nameOk || !emailOk || !pwOk} data-testid="button-register">
          <UserPlus className="h-5 w-5" /> {busy ? tr("Setting up...", "جارٍ الإعداد...") : tr("Create family", "أنشئ العائلة")}
        </ToyButton>
      </form>
    </AuthFrame>
  );
}
