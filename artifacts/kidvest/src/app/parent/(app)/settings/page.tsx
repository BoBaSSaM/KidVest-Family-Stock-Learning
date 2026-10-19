"use client";
import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, KeyRound, Save, UserRound } from "lucide-react";
import { getGetSettingsQueryKey, useGetSettings, useUpdateSettings } from "@workspace/api-client-react";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/components/i18n";
import { ErrorState, PageHeader, PageSkeleton, Panel, ToyButton, errMsg } from "@/components/kv/kit";
import { Field } from "@/components/kv/auth";

export default function SettingsPage() {
  const { tr } = useI18n();
  const qc = useQueryClient();
  const q = useGetSettings();
  const update = useUpdateSettings();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const init = useRef(false);

  useEffect(() => {
    if (q.data && !init.current) { init.current = true; setName(q.data.name); setEmail(q.data.email ?? ""); }
  }, [q.data]);

  if (q.isLoading) return <PageSkeleton />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const s = q.data;

  const save = (data: Parameters<typeof update.mutate>[0]["data"], msg: string, after?: () => void) =>
    update.mutate({ data }, {
      onSuccess: (u) => { qc.setQueryData(getGetSettingsQueryKey(), u); toast.success(msg); after?.(); },
      onError: (e) => toast.error(errMsg(e)),
    });

  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow={tr("Settings", "الإعدادات")} title={tr("Your parent account", "حساب الوالد")} />
      <div className="space-y-6">
        <Panel className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2 font-display text-xl font-extrabold"><UserRound className="h-5 w-5 text-primary" />{tr("Profile", "الملف الشخصي")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tr("Name", "الاسم")} htmlFor="s-name"><input id="s-name" className="toy-input" value={name} onChange={(e) => setName(e.target.value)} data-testid="input-settings-name" /></Field>
            <Field label={tr("Email", "البريد الإلكتروني")} htmlFor="s-email"><input id="s-email" type="email" className="toy-input" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="input-settings-email" /></Field>
          </div>
          <ToyButton className="self-start" disabled={update.isPending || name.trim().length < 2 || (name === s.name && email === (s.email ?? ""))} onClick={() => save({ name: name.trim(), email: email.trim() || undefined }, tr("Profile saved", "حُفظ الملف"))} data-testid="button-save-profile">
            <Save className="h-5 w-5" />{tr("Save profile", "احفظ الملف")}
          </ToyButton>
        </Panel>
        <Panel className="flex items-center gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/40 text-accent-foreground dark:text-accent"><Bell className="h-6 w-6" /></span>
          <div className="flex-1">
            <h2 className="font-extrabold">{tr("Request notifications", "إشعارات الطلبات")}</h2>
            <p className="text-sm font-semibold text-muted-foreground">{tr("Get notified when an explorer sends a new request.", "تلقَّ إشعارًا عندما يرسل مستكشف طلبًا جديدًا.")}</p>
          </div>
          <Switch checked={s.notifications} disabled={update.isPending} onCheckedChange={(v) => save({ notifications: v }, v ? tr("Notifications on", "الإشعارات مفعّلة") : tr("Notifications off", "الإشعارات متوقفة"))} aria-label={tr("Notifications", "الإشعارات")} data-testid="switch-notifications" />
        </Panel>
        <Panel className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2 font-display text-xl font-extrabold"><KeyRound className="h-5 w-5 text-primary" />{tr("Change password", "تغيير كلمة المرور")}</h2>
          {s.isDemo && <p className="text-sm font-bold text-muted-foreground">{tr("Demo accounts may not allow password changes.", "قد لا تسمح الحسابات التجريبية بتغيير كلمة المرور.")}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tr("Current password", "كلمة المرور الحالية")} htmlFor="s-cur"><input id="s-cur" type="password" autoComplete="current-password" className="toy-input" value={current} onChange={(e) => setCurrent(e.target.value)} data-testid="input-current-password" /></Field>
            <Field label={tr("New password", "كلمة المرور الجديدة")} htmlFor="s-new" hint={tr("At least 8 characters.", "٨ أحرف على الأقل.")}><input id="s-new" type="password" autoComplete="new-password" className="toy-input" value={next} onChange={(e) => setNext(e.target.value)} data-testid="input-new-password" /></Field>
          </div>
          <ToyButton className="self-start" variant="outline" disabled={update.isPending || !current || next.length < 8} onClick={() => save({ currentPassword: current, newPassword: next }, tr("Password changed. Please sign in again.", "تغيّرت كلمة المرور. يرجى تسجيل الدخول مرة أخرى."), () => { setCurrent(""); setNext(""); void signOut({ callbackUrl: "/parent/login" }); })} data-testid="button-change-password">
            {tr("Update password", "حدّث كلمة المرور")}
          </ToyButton>
        </Panel>
      </div>
    </div>
  );
}
