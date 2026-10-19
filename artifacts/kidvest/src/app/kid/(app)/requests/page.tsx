"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MessageCircle, Send, X } from "lucide-react";
import { getGetRequestsQueryKey, useGetRequests, useReviewRequest, type StockRequest } from "@workspace/api-client-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useI18n } from "@/components/i18n";
import { EmptyState, ErrorState, PageHeader, Panel, Skel, SourceChip, ToyButton, ToyLink, errMsg, useInvalidateFamily } from "@/components/kv/kit";
import { StatusPill, TickerBlock, TypeTag } from "@/components/kv/status";

export default function KidRequests() {
  const { tr, money, num, dateTime } = useI18n();
  const q = useGetRequests({ query: { refetchInterval: 10_000, queryKey: getGetRequestsQueryKey() } });
  const review = useReviewRequest();
  const invalidate = useInvalidateFamily();
  const [cancel, setCancel] = useState<StockRequest | null>(null);

  return (
    <div>
      <PageHeader eyebrow={tr("Requests", "الطلبات")} title={tr("What I've asked for", "ما طلبته")} sub={tr("This page updates by itself when your parent decides.", "تتحدث هذه الصفحة تلقائيًا عندما يقرر والداك.")} actions={<ToyLink href="/kid/explore" variant="secondary"><Send className="h-5 w-5 rtl:-scale-x-100" />{tr("New request", "طلب جديد")}</ToyLink>} />
      {q.isLoading ? <div className="space-y-4">{[0, 1, 2].map((i) => <Skel key={i} className="h-32 rounded-[1.75rem]" />)}</div> : q.error ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : !q.data?.length ? (
        <EmptyState icon={<Send className="h-8 w-8" />} title={tr("No requests yet", "لا طلبات بعد")} body={tr("Find a company on Explore and ask to invest.", "اعثر على شركة في الاستكشاف واطلب الاستثمار.")} action={<ToyLink href="/kid/explore" size="sm">{tr("Explore", "استكشف")}</ToyLink>} />
      ) : (
        <div className="space-y-4">
          {q.data.map((r, i) => (
            <Panel key={r.id} className="kv-rise flex flex-col gap-4" style={{ animationDelay: `${i * 40}ms` }} data-testid={`card-request-${r.id}`}>
              <div className="flex flex-wrap items-center gap-3">
                <TickerBlock symbol={r.symbol} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-xl font-extrabold">{r.symbol}</p>
                  <p className="truncate text-xs font-bold text-muted-foreground">{r.companyName} · {dateTime(r.createdAt)}</p>
                </div>
                <TypeTag type={r.type} /><SourceChip source={r.source} /><StatusPill status={r.status} />
              </div>
              <p className="font-num text-sm font-bold">{num(r.quantity, 4)} × {money(r.priceAtApproval ?? r.priceAtRequest)} = {money(r.totalCost)}</p>
              {r.kidNote && <p className="rounded-2xl bg-muted p-3 text-sm font-semibold">{tr("My note", "ملاحظتي")}: {r.kidNote}</p>}
              {r.parentComment && (
                <div className="flex gap-3 rounded-2xl bg-primary/10 p-3">
                  <MessageCircle className="h-5 w-5 shrink-0 text-primary" />
                  <p className="text-sm font-bold">{r.parentComment}</p>
                </div>
              )}
              {r.status === "pending" && (
                <ToyButton size="sm" variant="outline" className="self-start" onClick={() => setCancel(r)} data-testid={`button-cancel-${r.id}`}><X className="h-4 w-4" />{tr("Cancel request", "ألغِ الطلب")}</ToyButton>
              )}
            </Panel>
          ))}
        </div>
      )}
      <AlertDialog open={!!cancel} onOpenChange={(o) => !o && setCancel(null)}>
        <AlertDialogContent className="rounded-[2rem] border-2">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl font-extrabold">{tr("Cancel this request?", "إلغاء هذا الطلب؟")}</AlertDialogTitle>
            <AlertDialogDescription className="font-semibold">{cancel?.symbol} · {money(cancel?.totalCost)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl font-extrabold">{tr("Keep it", "أبقِه")}</AlertDialogCancel>
            <AlertDialogAction className="rounded-2xl bg-destructive font-extrabold text-destructive-foreground" disabled={review.isPending} data-testid="button-confirm-cancel"
              onClick={(e) => { e.preventDefault(); if (cancel) review.mutate({ id: cancel.id, data: { action: "cancel" } }, { onSuccess: (res) => { if (res.success) toast.success(res.message || tr("Request cancelled", "أُلغي الطلب")); else toast.error(res.message); invalidate(); setCancel(null); }, onError: (er) => toast.error(errMsg(er)) }); }}>
              {tr("Cancel request", "ألغِ الطلب")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
