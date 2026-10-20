"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowUpRight, Clock3, Info, LineChart } from "lucide-react";
import {
  getGetPortfolioQueryKey, getGetStockChartQueryKey, getGetStockQuoteQueryKey, useGetPortfolio, useGetStockChart, useGetStockQuote, type GetStockChartRange,
} from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n";
import { Chip, Disclaimer, EmptyState, ErrorState, PageSkeleton, Panel, Skel, SourceChip, ToyButton } from "@/components/kv/kit";
import { TrendArea } from "@/components/kv/charts";
import { TickerBlock } from "@/components/kv/status";
import { RequestDialog, type RequestTarget } from "@/components/kv/request-dialog";

const RANGES: GetStockChartRange[] = ["1D", "1W", "1M", "1Y"];

export default function StockPage() {
  const { tr, money, pct, num, dateTime } = useI18n();
  const params = useParams<{ symbol: string }>();
  const symbol = decodeURIComponent(params.symbol ?? "").toUpperCase();
  const [range, setRange] = useState<GetStockChartRange>("1M");
  const [target, setTarget] = useState<RequestTarget | null>(null);
  const quote = useGetStockQuote({ symbol }, { query: { enabled: !!symbol, refetchInterval: 60_000, queryKey: getGetStockQuoteQueryKey({ symbol }) } });
  const chart = useGetStockChart({ symbol, range }, { query: { enabled: !!symbol && !!quote.data, queryKey: getGetStockChartQueryKey({ symbol, range }) } });
  const pf = useGetPortfolio(undefined, { query: { queryKey: getGetPortfolioQueryKey() } });
  const holding = pf.data?.holdings.find((h) => h.symbol === symbol);

  if (quote.isLoading) return <PageSkeleton />;
  if (quote.error || !quote.data) return (
    <div className="space-y-4">
      <BackLink />
      <ErrorState error={quote.error ?? new Error(tr("No quote found for this ticker.", "لا يوجد سعر لهذا الرمز."))} onRetry={() => quote.refetch()} />
    </div>
  );
  const s = quote.data;
  const up = s.changePercent >= 0;
  const nonUsd = s.currency && s.currency.toUpperCase() !== "USD";

  return (
    <div className="space-y-6">
      <BackLink />
      <section className="kv-rise flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-4">
          <TickerBlock symbol={s.symbol} size={72} />
          <div>
            <div className="flex flex-wrap items-center gap-2"><h1 className="font-display text-4xl font-extrabold">{s.symbol}</h1><SourceChip source={s.source} /><Chip>{s.category}</Chip></div>
            <p className="font-bold text-muted-foreground">{s.name}</p>
          </div>
        </div>
        <div className="text-start md:text-end">
          <p className="font-num text-4xl font-bold" data-testid="text-price">{money(s.price)}</p>
          <p className={cn("font-num font-bold", up ? "text-secondary" : "text-destructive")}>{s.change >= 0 ? "+" : ""}{num(s.change)} ({pct(s.changePercent)})</p>
          <p className="mt-1 flex items-center gap-1 text-xs font-bold text-muted-foreground md:justify-end"><Clock3 className="h-3.5 w-3.5" />{s.source === "demo" ? tr("Sample price dated", "سعر تجريبي بتاريخ") : tr("Updated", "تحديث")} {dateTime(s.updatedAt)} · {s.marketState} · {s.currency}</p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Panel>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-extrabold">{tr("Price path", "مسار السعر")}</h2>
            <div role="tablist" className="flex gap-1 rounded-2xl bg-muted p-1">
              {RANGES.map((r) => (
                <button key={r} role="tab" aria-selected={range === r} onClick={() => setRange(r)} data-testid={`tab-range-${r}`}
                  className={cn("rounded-xl px-3 py-1.5 font-num text-sm font-bold", range === r ? "bg-card shadow-[0_2px_8px_hsl(var(--foreground)/0.10)]" : "text-muted-foreground")}>{r}</button>
              ))}
            </div>
          </div>
          {chart.isLoading ? <Skel className="h-[260px]" /> : chart.error ? <ErrorState error={chart.error} onRetry={() => chart.refetch()} /> : (chart.data?.points.length ?? 0) < 2 ? (
            <EmptyState icon={<LineChart className="h-8 w-8" />} title={tr("Not enough price points for this range", "لا توجد نقاط كافية لهذا النطاق")} />
          ) : (
            <>
              <TrendArea points={chart.data!.points} color={up ? "hsl(var(--chart-2))" : "hsl(var(--chart-4))"} height={260} short={range === "1D"} />
              {chart.data!.source === "demo" && <p className="mt-2 text-xs font-bold text-muted-foreground">{tr("Demo chart from dated sample fixtures, not live market data.", "رسم تجريبي من بيانات عينة مؤرخة، وليس بيانات سوق مباشرة.")}</p>}
            </>
          )}
        </Panel>
        <div className="flex flex-col gap-6">
          <Panel className="flex flex-col gap-4 border-secondary/60">
            <h2 className="font-display text-xl font-extrabold">{tr("Like this company?", "أعجبتك هذه الشركة؟")}</h2>
            <p className="text-sm font-semibold text-muted-foreground">{tr("Send a request. Your parent checks the latest price and decides with you.", "أرسل طلبًا. سيتحقق والداك من آخر سعر ويقرران معك.")}</p>
            {nonUsd && <p className="rounded-2xl bg-accent/20 p-3 text-xs font-bold">{tr(`This ticker trades in ${s.currency}. Ghiras wallets are USD only, so requests may be refused (no currency conversion).`, `يُتداول هذا الرمز بعملة ${s.currency}. محافظ «غراس» بالدولار فقط، لذا قد تُرفض الطلبات (لا تحويل عملات).`)}</p>}
            <ToyButton size="lg" variant="secondary" onClick={() => setTarget({ symbol: s.symbol, companyName: s.name, price: s.price, source: s.source, type: "buy" })} data-testid="button-request-buy">
              <ArrowUpRight className="h-5 w-5" />{tr("Ask to invest", "اطلب الاستثمار")}
            </ToyButton>
            {holding && holding.quantity > 0 && (
              <ToyButton variant="outline" onClick={() => setTarget({ symbol: s.symbol, companyName: s.name, price: s.price, source: s.source, type: "sell", maxQuantity: holding.quantity })} data-testid="button-request-sell">
                {tr("Ask to sell", "اطلب البيع")} ({num(holding.quantity, 4)})
              </ToyButton>
            )}
          </Panel>
          <Panel>
            <h2 className="mb-2 flex items-center gap-2 font-display text-xl font-extrabold"><Info className="h-5 w-5 text-primary" />{tr("What do they do?", "ماذا يفعلون؟")}</h2>
            <p className="font-semibold leading-relaxed text-muted-foreground">{s.summary || tr("No story for this company yet. Ask a grown-up to look it up with you!", "لا توجد قصة لهذه الشركة بعد. اطلب من شخص كبير البحث معك!")}</p>
          </Panel>
        </div>
      </div>
      <Disclaimer />
      <RequestDialog target={target} onOpenChange={(o) => !o && setTarget(null)} />
    </div>
  );
}

function BackLink() {
  const { tr } = useI18n();
  return <Link href="/kid/explore" className="inline-flex items-center gap-1.5 font-extrabold text-muted-foreground hover:text-foreground" data-testid="link-back-explore"><ArrowLeft className="h-4 w-4 rtl:rotate-180" />{tr("Back to explore", "العودة للاستكشاف")}</Link>;
}
