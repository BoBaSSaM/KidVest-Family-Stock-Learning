"use client";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { CreditCard, PlugZap, Sparkles, Wallet } from "lucide-react";
import { useFundWallet, useGetKids, useGetPayments, useGetPaymentSetup } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n";
import { EmptyState, ErrorState, KvAvatar, PageHeader, Panel, Skel, ToyButton, ToyLink, errMsg, useInvalidateFamily } from "@/components/kv/kit";
import { LedgerList } from "@/components/kv/portfolio-view";
import { useKvUser } from "@/components/kv/shell";
import { PaymentReturn } from "@/components/kv/payment-return";

export default function Payments() {
  const { tr, money } = useI18n();
  const { user } = useKvUser();
  const demo = !!user?.isDemo;
  const kids = useGetKids();
  const payments = useGetPayments();
  const setup = useGetPaymentSetup();
  const fund = useFundWallet();
  const invalidate = useInvalidateFamily();
  const [kidId, setKidId] = useState("");
  const [amount, setAmount] = useState("25");
  const [blocked, setBlocked] = useState<string | null>(null);
  const [stripeTest, setStripeTest] = useState(false);
  const stripeMode = !demo || stripeTest;

  useEffect(() => { if (!kidId && kids.data?.length) setKidId(kids.data[0].id); }, [kidId, kids.data]);
  const n = Number(amount);
  const ok = !!kidId && Number.isFinite(n) && n >= 1 && n <= 10000;

  const submit = () => {
    setBlocked(null);
    fund.mutate({ data: { kidId, amount: n, useStripe: stripeMode } }, {
      onSuccess: (res) => {
        if (res.checkoutUrl) { window.location.href = res.checkoutUrl; return; }
        if (res.success) { toast.success(res.message || tr("Virtual credits added", "أُضيف الرصيد الافتراضي")); invalidate(); }
        else { setBlocked(res.message); }
      },
      onError: (e) => setBlocked(errMsg(e)),
    });
  };

  return (
    <div>
      <PageHeader eyebrow={tr("Wallet", "المحفظة")} title={tr("Fund an explorer's wallet", "اشحن محفظة مستكشف")} sub={demo ? tr("Add sample credits or try Stripe test Checkout. No real money moves.", "أضف رصيدًا نموذجيًا أو جرّب دفع Stripe التجريبي. لا تنتقل أموال حقيقية.") : tr("Stripe TEST payments only. Use a test card; no real money or real stocks.", "مدفوعات Stripe تجريبية فقط. استخدم بطاقة اختبار؛ لا أموال أو أسهم حقيقية.")} />
      <Suspense><PaymentReturn /></Suspense>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Panel className={cn("flex flex-col gap-5", demo ? "border-accent" : "")}>
          <div className="flex items-center gap-3">
            <span className={cn("grid h-12 w-12 place-items-center rounded-2xl", demo ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground")}>{demo ? <Sparkles className="h-6 w-6" /> : <CreditCard className="h-6 w-6" />}</span>
            <h2 className="font-display text-xl font-extrabold">{stripeMode ? tr("Stripe test top-up", "شحن Stripe تجريبي") : tr("Add virtual credits", "أضف رصيدًا افتراضيًا")}</h2>
          </div>
          {demo && <label className="flex items-center gap-3 rounded-2xl bg-muted p-3 text-sm font-bold"><input type="checkbox" checked={stripeTest} onChange={e => setStripeTest(e.target.checked)} disabled={!setup.data?.enabled} />{tr("Use Stripe TEST Checkout instead of instant sample credits", "استخدم دفع Stripe التجريبي بدل الرصيد النموذجي الفوري")}</label>}
          {stripeMode && <p className="rounded-2xl bg-primary/10 p-3 text-sm font-semibold">{tr("Test card: 4242 4242 4242 4242, any future expiry and any three-digit CVC. Your wallet is credited only after Stripe confirms payment.", "بطاقة اختبار: 4242 4242 4242 4242، تاريخ مستقبلي ورمز CVC من ثلاثة أرقام. لا تُشحن المحفظة إلا بعد تأكيد Stripe.")}</p>}
          {stripeMode && !setup.isLoading && !setup.data?.enabled && <p role="alert" className="text-sm font-bold text-destructive">{tr("Stripe test checkout is temporarily unavailable. No charge will be made.", "دفع Stripe التجريبي غير متاح مؤقتًا. لن يحدث خصم.")}</p>}
          {kids.isLoading ? <Skel className="h-24" /> : kids.error ? <ErrorState error={kids.error} onRetry={() => kids.refetch()} /> : !kids.data?.length ? (
            <EmptyState icon={<Wallet className="h-8 w-8" />} title={tr("Add an explorer first", "أضف مستكشفًا أولًا")} action={<ToyLink href="/parent/kids" size="sm">{tr("Add explorer", "أضف مستكشفًا")}</ToyLink>} />
          ) : (
            <>
              <fieldset>
                <legend className="mb-2 text-sm font-extrabold">{tr("Who gets it?", "لمن؟")}</legend>
                <div className="flex flex-wrap gap-2">
                  {kids.data.map((k) => (
                    <button key={k.id} type="button" aria-pressed={kidId === k.id} onClick={() => setKidId(k.id)} data-testid={`button-fund-kid-${k.id}`}
                      className={cn("flex items-center gap-2 rounded-2xl border-2 py-1.5 pe-3 ps-1.5 text-sm font-extrabold", kidId === k.id ? "border-primary bg-primary/10" : "border-border")}>
                      <KvAvatar avatar={k.avatar} name={k.name} size={28} />{k.name}<span className="font-num text-xs text-muted-foreground">{money(k.balance)}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-extrabold">{tr("Amount (USD)", "المبلغ (دولار)")}</span>
                <input type="number" min={1} max={10000} className="toy-input font-num text-xl" value={amount} onChange={(e) => setAmount(e.target.value)} data-testid="input-fund-amount" />
                <div className="flex gap-2">{[10, 25, 50, 100].map((v) => <button key={v} type="button" onClick={() => setAmount(String(v))} className="rounded-xl bg-muted px-3 py-1 font-num text-sm font-bold hover:bg-primary/15">{money(v)}</button>)}</div>
              </label>
              {blocked && (
                <div role="alert" className="flex gap-3 rounded-2xl border-2 border-dashed border-destructive/50 bg-destructive/8 p-4 text-sm font-bold" data-testid="text-payment-blocked">
                  <PlugZap className="h-5 w-5 shrink-0 text-destructive" />
                  <div><p>{blocked}</p><p className="mt-1 text-muted-foreground">{tr("No charge was made and no balance was added.", "لم يتم أي خصم ولم يُضف أي رصيد.")}</p></div>
                </div>
              )}
              <ToyButton size="lg" variant={stripeMode ? "primary" : "accent"} disabled={!ok || fund.isPending || (stripeMode && !setup.data?.enabled)} onClick={submit} data-testid="button-fund">
                {fund.isPending ? tr("Working...", "جارٍ التنفيذ...") : !stripeMode ? tr(`Add ${money(n || 0)} virtual credits`, `أضف ${money(n || 0)} رصيدًا افتراضيًا`) : tr("Continue to Stripe TEST", "المتابعة إلى Stripe التجريبي")}
              </ToyButton>
            </>
          )}
        </Panel>
        <div>
          {payments.isLoading ? <Skel className="h-80 rounded-[1.75rem]" /> : payments.error ? <ErrorState error={payments.error} onRetry={() => payments.refetch()} /> : <LedgerList history={payments.data ?? []} showKid />}
        </div>
      </div>
    </div>
  );
}
