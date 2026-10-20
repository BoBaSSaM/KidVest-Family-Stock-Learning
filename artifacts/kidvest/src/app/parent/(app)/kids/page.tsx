"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KeyRound, Pencil, Trash2, UserPlus, Users } from "lucide-react";
import { useCreateKid, useDeleteKid, useGetKids, useUpdateKid, type Kid } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n";
import {
  AVATARS, EmptyState, ErrorState, KvAvatar, PageHeader, Panel, SignedMoney, Skel, ToyButton, errMsg, useInvalidateFamily,
} from "@/components/kv/kit";
import { Field } from "@/components/kv/auth";

type FormState = { name: string; username: string; password: string; age: string; avatar: string; dailyLimit: string; monthlyLimit: string };
const blank: FormState = { name: "", username: "", password: "", age: "9", avatar: "comet", dailyLimit: "50", monthlyLimit: "200" };

export default function KidsPage() {
  const { tr } = useI18n();
  const q = useGetKids();
  const [editing, setEditing] = useState<Kid | "new" | null>(null);
  const [resetting, setResetting] = useState<Kid | null>(null);
  const [deleting, setDeleting] = useState<Kid | null>(null);

  return (
    <div>
      <PageHeader
        eyebrow={tr("Explorers", "المستكشفون")}
        title={tr("Your crew", "فريقك")}
        sub={tr("Logins, avatars and spending limits for each child.", "بيانات الدخول والصور وحدود الإنفاق لكل طفل.")}
        actions={<ToyButton onClick={() => setEditing("new")} data-testid="button-add-kid"><UserPlus className="h-5 w-5" />{tr("Add explorer", "أضف مستكشفًا")}</ToyButton>}
      />
      {q.isLoading ? (
        <div className="grid gap-5 md:grid-cols-2">{[0, 1].map((i) => <Skel key={i} className="h-60 rounded-[1.75rem]" />)}</div>
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data?.length ? (
        <EmptyState icon={<Users className="h-8 w-8" />} title={tr("Nobody aboard yet", "لا أحد على المتن بعد")} body={tr("Create a username and password your child will use on the explorer door.", "أنشئ اسم مستخدم وكلمة مرور يستخدمها طفلك على باب المستكشف.")} action={<ToyButton onClick={() => setEditing("new")}>{tr("Add the first explorer", "أضف أول مستكشف")}</ToyButton>} />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {q.data.map((k, i) => <KidCard key={k.id} kid={k} delay={i * 60} onEdit={() => setEditing(k)} onReset={() => setResetting(k)} onDelete={() => setDeleting(k)} />)}
        </div>
      )}
      <KidFormDialog target={editing} onClose={() => setEditing(null)} />
      <ResetDialog kid={resetting} onClose={() => setResetting(null)} />
      <DeleteDialog kid={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}

function KidCard({ kid, delay, onEdit, onReset, onDelete }: { kid: Kid; delay: number; onEdit: () => void; onReset: () => void; onDelete: () => void }) {
  const { tr, money } = useI18n();
  return (
    <Panel className="kv-rise flex flex-col gap-5" style={{ animationDelay: `${delay}ms` }} data-testid={`card-kid-${kid.id}`}>
      <div className="flex items-center gap-4">
        <KvAvatar avatar={kid.avatar} name={kid.name} size={60} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-2xl font-extrabold">{kid.name}</h3>
          <p className="text-sm font-bold text-muted-foreground">@{kid.username} · {tr("age", "العمر")} {kid.age}</p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-center sm:grid-cols-3">
        {[
          [tr("Wallet", "المحفظة"), money(kid.balance)],
          [tr("Portfolio", "المحفظة الاستثمارية"), money(kid.portfolioValue)],
          [tr("Lessons", "الدروس"), String(kid.completedLessons.length)],
          [tr("Experience", "الخبرة"), `${kid.xp} XP`],
          [tr("Coins", "العملات"), String(kid.coins)],
        ].map(([l, v]) => (
          <div key={l} className="rounded-2xl bg-muted p-3"><dt className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">{l}</dt><dd className="font-num font-bold">{v}</dd></div>
        ))}
      </dl>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold">
        <span>{tr("Daily", "يومي")} <b className="font-num">{money(kid.dailyLimit)}</b> · {tr("Monthly", "شهري")} <b className="font-num">{money(kid.monthlyLimit)}</b></span>
        <SignedMoney value={kid.gainLoss} />
      </div>
      <div className="flex flex-wrap gap-2">
        <ToyButton size="sm" variant="outline" onClick={onEdit} data-testid={`button-edit-kid-${kid.id}`}><Pencil className="h-4 w-4" />{tr("Edit & limits", "تعديل وحدود")}</ToyButton>
        <ToyButton size="sm" variant="outline" onClick={onReset} data-testid={`button-reset-kid-${kid.id}`}><KeyRound className="h-4 w-4" />{tr("Reset password", "إعادة كلمة المرور")}</ToyButton>
        <ToyButton size="sm" variant="ghost" className="text-destructive" onClick={onDelete} data-testid={`button-delete-kid-${kid.id}`}><Trash2 className="h-4 w-4" />{tr("Remove", "حذف")}</ToyButton>
      </div>
    </Panel>
  );
}

function KidFormDialog({ target, onClose }: { target: Kid | "new" | null; onClose: () => void }) {
  const { tr, lang } = useI18n();
  const invalidate = useInvalidateFamily();
  const create = useCreateKid();
  const update = useUpdateKid();
  const [f, setF] = useState<FormState>(blank);
  const isNew = target === "new";

  useEffect(() => {
    if (target === "new") setF(blank);
    else if (target) setF({ name: target.name, username: target.username ?? "", password: "", age: String(target.age ?? 9), avatar: target.avatar, dailyLimit: String(target.dailyLimit), monthlyLimit: String(target.monthlyLimit) });
  }, [target]);

  const set = (k: keyof FormState) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));
  const age = Number(f.age), daily = Number(f.dailyLimit), monthly = Number(f.monthlyLimit);
  const valid = f.name.trim().length >= 2 && f.username.trim().length >= 3 && (!isNew || f.password.length >= 8) && age >= 7 && age <= 17 && daily >= 0 && monthly >= 0;
  const pending = create.isPending || update.isPending;

  const submit = () => {
    if (!valid || !target) return;
    const base = { name: f.name.trim(), username: f.username.trim(), age, avatar: f.avatar, dailyLimit: daily, monthlyLimit: monthly };
    const done = { onSuccess: () => { toast.success(isNew ? tr("Explorer added", "أُضيف المستكشف") : tr("Changes saved", "حُفظت التغييرات")); invalidate(); onClose(); }, onError: (e: unknown) => toast.error(errMsg(e)) };
    if (target === "new") create.mutate({ data: { ...base, password: f.password } }, done);
    else update.mutate({ id: target.id, data: base }, done);
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] max-w-lg overflow-y-auto rounded-[2rem] border-2">
        <DialogHeader className="text-start">
          <DialogTitle className="font-display text-2xl font-extrabold">{isNew ? tr("New explorer", "مستكشف جديد") : tr("Edit explorer", "تعديل المستكشف")}</DialogTitle>
          <DialogDescription className="font-semibold">{tr("Limits cap how much each request can spend.", "الحدود تقيّد ما يمكن لكل طلب إنفاقه.")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <fieldset>
            <legend className="mb-2 text-sm font-extrabold">{tr("Avatar", "الصورة الرمزية")}</legend>
            <div className="flex flex-wrap gap-2">
              {AVATARS.map((a) => (
                <button key={a.key} type="button" onClick={() => setF((p) => ({ ...p, avatar: a.key }))} aria-pressed={f.avatar === a.key} aria-label={lang === "ar" ? a.ar : a.en}
                  className={cn("rounded-2xl p-1 transition", f.avatar === a.key ? "ring-4 ring-primary" : "opacity-70 hover:opacity-100")} data-testid={`button-avatar-${a.key}`}>
                  <KvAvatar avatar={a.key} size={44} />
                </button>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tr("Name", "الاسم")} htmlFor="k-name"><input id="k-name" className="toy-input" value={f.name} onChange={set("name")} data-testid="input-kid-name" /></Field>
            <Field label={tr("Age", "العمر")} htmlFor="k-age"><input id="k-age" type="number" min={7} max={17} className="toy-input" value={f.age} onChange={set("age")} data-testid="input-kid-age" /></Field>
          </div>
          <Field label={tr("Username", "اسم المستخدم")} htmlFor="k-user"><input id="k-user" autoCapitalize="none" className="toy-input" value={f.username} onChange={set("username")} data-testid="input-kid-username" /></Field>
          {isNew && <Field label={tr("Password", "كلمة المرور")} htmlFor="k-pw" hint={tr("At least 8 characters.", "٨ أحرف على الأقل.")}><input id="k-pw" type="password" autoComplete="new-password" className="toy-input" value={f.password} onChange={set("password")} data-testid="input-kid-password" /></Field>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tr("Daily limit (USD)", "الحد اليومي (دولار)")} htmlFor="k-d"><input id="k-d" type="number" min={0} className="toy-input font-num" value={f.dailyLimit} onChange={set("dailyLimit")} data-testid="input-kid-daily" /></Field>
            <Field label={tr("Monthly limit (USD)", "الحد الشهري (دولار)")} htmlFor="k-m"><input id="k-m" type="number" min={0} className="toy-input font-num" value={f.monthlyLimit} onChange={set("monthlyLimit")} data-testid="input-kid-monthly" /></Field>
          </div>
          <ToyButton size="lg" disabled={!valid || pending} onClick={submit} data-testid="button-save-kid">{pending ? tr("Saving...", "جارٍ الحفظ...") : isNew ? tr("Create explorer", "أنشئ المستكشف") : tr("Save changes", "احفظ التغييرات")}</ToyButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResetDialog({ kid, onClose }: { kid: Kid | null; onClose: () => void }) {
  const { tr } = useI18n();
  const update = useUpdateKid();
  const [pw, setPw] = useState("");
  useEffect(() => { setPw(""); }, [kid]);
  return (
    <Dialog open={!!kid} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-[2rem] border-2">
        <DialogHeader className="text-start">
          <DialogTitle className="font-display text-2xl font-extrabold">{tr("New password for", "كلمة مرور جديدة لـ")} {kid?.name}</DialogTitle>
          <DialogDescription className="font-semibold">{tr("Share it with your child in person.", "شاركها مع طفلك شخصيًا.")}</DialogDescription>
        </DialogHeader>
        <input type="password" autoComplete="new-password" className="toy-input" value={pw} onChange={(e) => setPw(e.target.value)} aria-label={tr("New password", "كلمة المرور الجديدة")} data-testid="input-reset-password" />
        <ToyButton disabled={pw.length < 8 || update.isPending} onClick={() => kid && update.mutate({ id: kid.id, data: { password: pw } }, { onSuccess: () => { toast.success(tr("Password updated", "حُدّثت كلمة المرور")); onClose(); }, onError: (e) => toast.error(errMsg(e)) })} data-testid="button-confirm-reset">
          <KeyRound className="h-5 w-5" />{update.isPending ? tr("Saving...", "جارٍ الحفظ...") : tr("Set password", "عيّن كلمة المرور")}
        </ToyButton>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ kid, onClose }: { kid: Kid | null; onClose: () => void }) {
  const { tr } = useI18n();
  const invalidate = useInvalidateFamily();
  const del = useDeleteKid();
  return (
    <AlertDialog open={!!kid} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="rounded-[2rem] border-2">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-2xl font-extrabold">{tr("Remove", "حذف")} {kid?.name}?</AlertDialogTitle>
          <AlertDialogDescription className="font-semibold">{tr("Their login, virtual holdings and request history will be deleted. This can't be undone.", "سيتم حذف بيانات الدخول والحيازات الافتراضية وسجل الطلبات. لا يمكن التراجع.")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-2xl font-extrabold">{tr("Keep", "إبقاء")}</AlertDialogCancel>
          <AlertDialogAction className="rounded-2xl bg-destructive font-extrabold text-destructive-foreground hover:bg-destructive/90" disabled={del.isPending}
            onClick={(e) => { e.preventDefault(); if (kid) del.mutate({ id: kid.id }, { onSuccess: () => { toast.success(tr("Explorer removed", "حُذف المستكشف")); invalidate(); onClose(); }, onError: (er) => toast.error(errMsg(er)) }); }}
            data-testid="button-confirm-delete">
            {del.isPending ? tr("Removing...", "جارٍ الحذف...") : tr("Remove", "حذف")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
