"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { confirmPayment, type PaymentStatus } from "@workspace/api-client-react";
import { useI18n } from "@/components/i18n";
import { Panel, ToyButton, errMsg, useInvalidateFamily } from "./kit";

export function PaymentReturn() {
  const search = useSearchParams();
  const sessionId = search.get("session_id");
  const cancelled = search.get("cancelled") === "1";
  const { tr, money } = useI18n();
  const invalidate = useInvalidateFamily();
  const invalidateRef = useRef(invalidate);
  invalidateRef.current = invalidate;
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let count = 0;
    async function verify() {
      try {
        const result = await confirmPayment({ sessionId: sessionId!, cancelled });
        if (!active) return;
        setStatus(result); setError("");
        if (result.status === "completed") invalidateRef.current();
        else if (result.status === "pending" && !cancelled && ++count < 12) timer = setTimeout(verify, 5000);
      } catch (e) { if (active) setError(errMsg(e)); }
    }
    verify();
    return () => { active = false; clearTimeout(timer); };
  }, [sessionId, retry, cancelled]);
  if (!sessionId) return null;
  return <Panel role="status" className="mb-6 border-primary" data-testid="payment-return">
    <h2 className="font-display text-xl font-extrabold">{status?.status === "completed" ? tr("Test payment confirmed", "تأكد الدفع التجريبي") : cancelled ? tr("Checkout cancelled", "أُلغي الدفع") : tr("Checking your test payment", "نتحقق من الدفع التجريبي")}</h2>
    <p className="mt-2 text-sm font-semibold">{cancelled && status?.status !== "completed" ? tr("You left Checkout. No wallet credit is added unless Stripe confirms a completed payment. You can retry from this page.", "غادرت صفحة الدفع. لا يُضاف رصيد إلا إذا أكد Stripe اكتمال الدفع. يمكنك المحاولة مجددًا من هذه الصفحة.") : status?.message || tr("Confirming securely with Stripe. This page never credits your wallet from a URL alone.", "نتحقق بأمان مع Stripe. لا تضيف هذه الصفحة رصيدًا اعتمادًا على الرابط وحده.")}</p>
    {status?.status === "completed" && <p className="mt-2 font-num font-bold">{money(status.amount)} · {tr("Stripe TEST — no real charge", "Stripe تجريبي — دون خصم حقيقي")}</p>}
    {status?.approvalStatus === "deferred" && <a className="mt-2 block font-bold underline" href="/parent/requests">{tr("Review your pending request", "راجع طلبك المعلّق")}</a>}
    {status?.receiptUrl && <a className="mt-2 block font-bold underline" href={status.receiptUrl} target="_blank" rel="noreferrer">{tr("View test receipt", "اعرض الإيصال التجريبي")}</a>}
    {error && <p role="alert" className="mt-2 text-sm font-bold text-destructive">{error}</p>}
    {(!status || status.status !== "completed") && <ToyButton className="mt-3" size="sm" onClick={() => setRetry(r => r + 1)}>{tr("Check payment status", "تحقق من حالة الدفع")}</ToyButton>}
  </Panel>;
}
