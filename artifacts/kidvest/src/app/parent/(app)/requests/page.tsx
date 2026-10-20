"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Check, ExternalLink, Inbox, RefreshCw, X } from "lucide-react";
import {
  getGetRequestsQueryKey, getGetStockQuoteQueryKey, useGetRequests, useGetStockQuote, useReviewRequest, type StockRequest,
} from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n";
import {
  EmptyState, ErrorState, KvAvatar, PageHeader, Panel, Skel, SourceChip, ToyButton, errMsg, useInvalidateFamily,
} from "@/components/kv/kit";
import { StatusPill, TickerBlock, TypeTag } from "@/components/kv/status";
import { Celebration } from "@/components/kv/celebration";

const FILTERS = ["pending", "approved", "rejected", "cancelled", "all"] as const;

export default function ParentRequests() {
  const { tr } = useI18n();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("pending");
  const [celebrate, setCelebrate] = useState(false);
  const q = useGetRequests({ query: { refetchInterval: 10_000, queryKey: getGetRequestsQueryKey() } });
  const list = (q.data ?? []).filter((r) => filter === "all" || r.status === filter);
  const labels: Record<string, string> = {
    pending: tr("Waiting", "بانتظار"), approved: tr("Approved", "مقبول"), rejected: tr("Declined", "مرفوض"), cancelled: tr("Cancelled", "ملغى"), all: tr("All", "الكل"),
  };

  return (
    <div>
      <PageHeader eyebrow={tr("Decisions", "القرارات")} title={tr("Requests from your explorers", "طلبات مستكشفيك")} sub={tr("Check the latest quote, adjust the amount and leave a comment they will read.", "راجع آخر سعر، عدّل الكمية، واترك تعليقًا سيقرؤونه.")} />
      <div className="mb-5 flex flex-wrap gap-2" role="tablist">
        {FILTERS.map((f) => {
          const count = f === "all" ? q.data?.length ?? 0 : (q.data ?? []).filter((r) => r.status === f).length;
          return (
            <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)} data-testid={`tab-filter-${f}`}
              className={cn("rounded-2xl border-2 px-4 py-2 text-sm font-extrabold transition", filter === f ? "border-primary bg-primary text-primary-foreground shadow-[0_3px_12px_hsl(var(--primary)/0.20)]" : "border-border bg-card hover:-translate-y-0.5")}>
              {labels[f]} <span className="font-num opacity-75">{count}</span>
            </button>
          );
        })}
      </div>
      {q.isLoading ? (
        <div className="space-y-4">{[0, 1, 2].map((i) => <Skel key={i} className="h-40 rounded-[1.75rem]" />)}</div>
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState icon={<Inbox className="h-8 w-8" />} title={filter === "pending" ? tr("All caught up", "لا شيء معلق") : tr("Nothing here", "لا شيء هنا")} body={tr("New requests appear automatically.", "تظهر الطلبات الجديدة تلقائيًا.")} />
      ) : (
        <div className="space-y-4">
          {list.map((r) => (r.status === "pending" ? <PendingCard key={r.id} r={r} onApproved={() => setCelebrate(true)} /> : <DoneCard key={r.id} r={r} />))}
        </div>
      )}
      <Celebration
        open={celebrate}
        onClose={() => setCelebrate(false)}
        title={tr("A great learning moment!", "لحظة تعلّم رائعة!")}
        description={tr("Your explorer earned a reward for completing this parent-reviewed activity.", "حصل مستكشفك على مكافأة لإكمال هذا النشاط بمراجعتك.")}
        xp={25}
        coins={5}
      />
    </div>
  );
}

function Header({ r }: { r: StockRequest }) {
  const { tr, dateTime } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <KvAvatar avatar={r.kidAvatar} name={r.kidName} size={44} />
      <div className="min-w-0 flex-1">
        <p className="font-extrabold">{r.kidName} <span className="text-muted-foreground">{tr("wants to", "يريد")} {r.type === "buy" ? tr("buy", "شراء") : tr("sell", "بيع")}</span></p>
        <p className="text-xs font-bold text-muted-foreground">{dateTime(r.createdAt)}</p>
      </div>
      <TypeTag type={r.type} />
      <SourceChip source={r.source} />
      <StatusPill status={r.status} />
    </div>
  );
}

function PendingCard({ r, onApproved }: { r: StockRequest; onApproved: () => void }) {
  const { tr, money, num, pct } = useI18n();
  const invalidate = useInvalidateFamily();
  const review = useReviewRequest();
  const [qty, setQty] = useState(String(r.quantity));
  const [comment, setComment] = useState("");
  const [checkout, setCheckout] = useState<string | null>(null);
  const [missing, setMissing] = useState<number | null>(null);
  const quote = useGetStockQuote({ symbol: r.symbol }, { query: { queryKey: getGetStockQuoteQueryKey({ symbol: r.symbol }), refetchInterval: 60_000 } });
  const price = quote.data?.price ?? r.priceAtRequest;
  const n = Number(qty);
  const qtyOk = Number.isFinite(n) && n > 0 && n <= 100000;
  const drift = r.priceAtRequest ? ((price - r.priceAtRequest) / r.priceAtRequest) * 100 : 0;

  const act = (action: "approve" | "reject", fundWithStripe = false) => {
    review.mutate(
      { id: r.id, data: { action, quantity: action === "approve" ? n : undefined, parentComment: comment.trim() || undefined, fundWithStripe } },
      {
        onSuccess: (res) => {
          if (res.checkoutUrl) { setCheckout(res.checkoutUrl); window.location.assign(res.checkoutUrl); return; }
          if (res.success) {
            toast.success(res.message || (action === "approve" ? tr("Approved", "تمت الموافقة") : tr("Declined", "تم الرفض")));
            if (action === "approve") onApproved();
          }
          else {
            toast.error(res.message, { description: res.missingAmount ? `${tr("Missing", "ينقص")} ${money(res.missingAmount)}` : undefined });
            setMissing(res.missingAmount ?? null);
            if (res.checkoutUrl) setCheckout(res.checkoutUrl);
          }
          invalidate();
        },
        onError: (e) => toast.error(errMsg(e)),
      },
    );
  };

  return (
    <Panel className="kv-rise flex flex-col gap-5 border-accent/60" data-testid={`card-request-${r.id}`}>
      <Header r={r} />
      <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <div className="flex items-center gap-4 rounded-2xl bg-muted p-4">
          <TickerBlock symbol={r.symbol} size={56} />
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl font-extrabold">{r.symbol}</p>
            <p className="truncate text-sm font-bold text-muted-foreground">{r.companyName}</p>
          </div>
          <div className="text-end">
            <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">{tr("Current quote", "السعر الحالي")}</p>
            {quote.isLoading ? <Skel className="ms-auto h-6 w-20" /> : <p className="font-num text-lg font-bold" data-testid={`text-quote-${r.id}`}>{quote.data && !quote.error ? money(price) : "—"}</p>}
            {quote.data && !quote.error && <p className={cn("font-num text-xs font-bold", drift >= 0 ? "text-secondary" : "text-destructive")}>{pct(drift)} {tr("since asked", "منذ الطلب")}</p>}
          </div>
        </div>
        <div className="rounded-2xl border-2 border-dashed border-border p-4 text-sm font-bold">
          <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">{tr("Explorer's note", "ملاحظة المستكشف")}</p>
          <p className="mt-1 text-base">{r.kidNote || <span className="text-muted-foreground">{tr("No note", "بدون ملاحظة")}</span>}</p>
          <p className="mt-2 text-xs text-muted-foreground">{tr("Asked", "طلب")} {num(r.quantity, 4)} @ {money(r.priceAtRequest)} = {money(r.totalCost)}</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-[200px_1fr]">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-extrabold">{tr("Quantity", "الكمية")}</span>
          <input type="number" min="0" step="any" className="toy-input font-num" value={qty} onChange={(e) => setQty(e.target.value)} data-testid={`input-quantity-${r.id}`} />
          <span className="font-num text-xs font-bold text-muted-foreground">≈ {money((qtyOk ? n : 0) * price)}</span>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-extrabold">{tr("Comment for your explorer", "تعليق لمستكشفك")}</span>
          <textarea rows={2} maxLength={500} className="toy-input" value={comment} onChange={(e) => setComment(e.target.value)} placeholder={tr("Great research! Let's start smaller...", "بحث رائع! لنبدأ بكمية أصغر...")} data-testid={`input-comment-${r.id}`} />
        </label>
      </div>
      {quote.error && <p role="alert" className="text-sm font-bold text-destructive">{tr("The current quote is unavailable. Refresh the quote before approving. Estimates use the original request price.", "السعر الحالي غير متاح. حدّث السعر قبل الموافقة. التقديرات تستخدم سعر الطلب الأصلي.")}</p>}
      {checkout && (
        <a href={checkout} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 self-start rounded-2xl bg-primary/12 px-4 py-2 text-sm font-extrabold text-primary">
          <ExternalLink className="h-4 w-4" />{tr("Open secure checkout to add funds", "افتح صفحة الدفع الآمن لإضافة رصيد")}
        </a>
      )}
      {missing !== null && <div className="rounded-2xl border-2 border-accent p-4 text-sm font-bold">
        <p>{tr(`The wallet needs ${money(missing)}. You can add demo credits from Payments, or use Stripe test Checkout below. The reviewed price is held for 35 minutes; no real charge occurs.`, `تحتاج المحفظة ${money(missing)}. أضف رصيدًا تجريبيًا من المدفوعات أو استخدم دفع Stripe التجريبي أدناه. يُحفظ سعر المراجعة ٣٥ دقيقة؛ لا يحدث خصم حقيقي.`)}</p>
        <ToyButton className="mt-3" disabled={review.isPending || !qtyOk || !quote.data || !!quote.error} onClick={() => act("approve", true)}>{tr(`Test-pay ${money(missing)} and approve`, `ادفع تجريبيًا ${money(missing)} ووافق`)}</ToyButton>
      </div>}
      <div className="flex flex-wrap gap-3">
        <ToyButton variant="secondary" disabled={!qtyOk || review.isPending || !quote.data || !!quote.error} onClick={() => act("approve")} data-testid={`button-approve-${r.id}`}><Check className="h-5 w-5" />{tr("Approve at current quote", "وافق بالسعر الحالي")}</ToyButton>
        <ToyButton variant="outline" disabled={review.isPending} onClick={() => act("reject")} data-testid={`button-reject-${r.id}`}><X className="h-5 w-5" />{tr("Decline", "ارفض")}</ToyButton>
        <ToyButton variant="ghost" size="sm" className="self-center" onClick={() => quote.refetch()} aria-label={tr("Refresh quote", "حدّث السعر")}><RefreshCw className={cn("h-4 w-4", quote.isFetching && "animate-spin")} /></ToyButton>
      </div>
    </Panel>
  );
}

function DoneCard({ r }: { r: StockRequest }) {
  const { tr, money, num } = useI18n();
  return (
    <Panel className="flex flex-col gap-3 opacity-95" data-testid={`card-request-${r.id}`}>
      <Header r={r} />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm font-bold">
        <span className="font-display text-lg font-extrabold">{r.symbol}</span>
        <span className="font-num">{num(r.quantity, 4)} × {money(r.priceAtApproval ?? r.priceAtRequest)}</span>
        <span className="font-num">{money(r.totalCost)}</span>
      </div>
      {(r.kidNote || r.parentComment) && (
        <div className="grid gap-2 text-sm md:grid-cols-2">
          {r.kidNote && <p className="rounded-2xl bg-muted p-3 font-semibold"><b>{tr("Note", "ملاحظة")}:</b> {r.kidNote}</p>}
          {r.parentComment && <p className="rounded-2xl bg-primary/10 p-3 font-semibold"><b>{tr("Your comment", "تعليقك")}:</b> {r.parentComment}</p>}
        </div>
      )}
    </Panel>
  );
}
