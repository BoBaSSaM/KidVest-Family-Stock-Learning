"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine, Sprout } from "lucide-react";
import {
  getGetSandboxQueryKey, useGetSandbox, useGetTrendingStocks, usePlaceSandboxTrade,
} from "@workspace/api-client-react";
import { useI18n } from "@/components/i18n";
import {
  Chip, Disclaimer, EmptyState, ErrorState, PageHeader, PageSkeleton, Panel, SourceChip, StatTile, ToyButton, errMsg,
} from "@/components/kv/kit";
import { TickerBlock } from "@/components/kv/status";

export default function KidSandboxPage() {
  const { tr, money, num, dateTime } = useI18n();
  const queryClient = useQueryClient();
  const sandbox = useGetSandbox();
  const market = useGetTrendingStocks();
  const trade = usePlaceSandboxTrade();
  const [symbol, setSymbol] = useState("");
  const [quantity, setQuantity] = useState("1");

  if (sandbox.isLoading) return <PageSkeleton />;
  if (sandbox.error || !sandbox.data) {
    return <ErrorState error={sandbox.error ?? new Error(tr("Practice account unavailable.", "حساب التدريب غير متاح."))} onRetry={() => sandbox.refetch()} />;
  }

  const book = sandbox.data;
  const selectedSymbol = symbol || market.data?.[0]?.symbol || "";
  const selectedStock = market.data?.find((stock) => stock.symbol === selectedSymbol);
  const currentHolding = book.holdings.find((holding) => holding.symbol === selectedSymbol);
  const amount = Number(quantity);
  const validQuantity = Number.isFinite(amount) && amount > 0 && amount <= 100_000;
  const estimatedCost = selectedStock && validQuantity ? amount * selectedStock.price : 0;

  function placeTrade(side: "buy" | "sell") {
    if (!selectedStock || !validQuantity) return;
    trade.mutate(
      { data: { symbol: selectedStock.symbol, side, quantity: amount } },
      {
        onSuccess: (updated) => {
          queryClient.setQueryData(getGetSandboxQueryKey(), updated);
          toast.success(side === "buy"
            ? tr("Practice shares added!", "تمت إضافة الأسهم التدريبية!")
            : tr("Practice shares sold.", "تم بيع الأسهم التدريبية."));
        },
        onError: (error) => toast.error(errMsg(error)),
      },
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={tr("Practice garden", "حديقة التدريب")}
        title={tr("Practice investing", "تدرّب على الاستثمار")}
        sub={tr("Try buying and selling with pretend money. Practice trades never need approval and never touch the family wallet.", "جرّب الشراء والبيع بأموال افتراضية. لا تحتاج صفقات التدريب إلى موافقة ولا تمس محفظة العائلة.")}
      />

      <Panel className="border-2 border-secondary/50 bg-secondary/10" data-testid="panel-sandbox-safety">
        <div className="flex items-start gap-3">
          <Sprout className="mt-0.5 h-6 w-6 shrink-0 text-secondary" />
          <div>
            <p className="font-extrabold">{tr("Practice only — no real money or shares", "تدريب فقط — بلا أموال أو أسهم حقيقية")}</p>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              {tr("This practice balance is separate from your family wallet. Family portfolio requests still go to your parent for approval. Sahim does not execute real trades.", "رصيد التدريب منفصل عن محفظة العائلة. تظل طلبات محفظة العائلة بحاجة إلى موافقة والديك. سهيم لا ينفذ صفقات حقيقية.")}
            </p>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label={tr("Practice money", "أموال التدريب")} value={money(book.balance)} icon={<Sprout className="h-5 w-5" />} tone="secondary" testId="text-sandbox-balance" />
        <StatTile label={tr("Practice holdings", "استثمارات التدريب")} value={num(book.holdings.length, 0)} icon={<ArrowUpFromLine className="h-5 w-5" />} testId="text-sandbox-holdings" />
        <StatTile label={tr("Practice trades", "صفقات التدريب")} value={num(book.trades.length, 0)} icon={<ArrowDownToLine className="h-5 w-5" />} tone="accent" testId="text-sandbox-trades" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <Panel className="space-y-4">
          <div>
            <h2 className="font-display text-xl font-extrabold">{tr("Choose a company", "اختر شركة")}</h2>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">{tr("Prices are checked again when you place a practice trade.", "يُتحقق من السعر مجددًا عند تنفيذ صفقة التدريب.")}</p>
          </div>
          {market.isLoading ? <div className="h-12 animate-pulse rounded-xl bg-muted" /> : market.error ? (
            <ErrorState error={market.error} onRetry={() => market.refetch()} />
          ) : !market.data?.length ? (
            <EmptyState icon={<Sprout className="h-8 w-8" />} title={tr("No companies available right now", "لا توجد شركات متاحة الآن")} body={tr("Try again when market prices are available.", "حاول مجددًا عند توفر أسعار السوق.")} />
          ) : (
            <>
              <label className="block space-y-1.5">
                <span className="text-sm font-extrabold">{tr("Company", "الشركة")}</span>
                <select className="toy-input h-12 w-full" value={selectedSymbol} onChange={(event) => setSymbol(event.target.value)} data-testid="select-sandbox-stock">
                  {market.data.map((stock) => <option key={stock.symbol} value={stock.symbol}>{stock.symbol} — {stock.name}</option>)}
                </select>
              </label>
              {selectedStock && (
                <div className="flex items-center gap-3 rounded-2xl bg-muted/60 p-3">
                  <TickerBlock symbol={selectedStock.symbol} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold">{selectedStock.name}</p>
                    <p className="font-num text-sm font-bold text-muted-foreground">{money(selectedStock.price)}</p>
                  </div>
                  <SourceChip source={selectedStock.source} />
                </div>
              )}
              <label className="block space-y-1.5">
                <span className="text-sm font-extrabold">{tr("Number of shares", "عدد الأسهم")}</span>
                <input
                  className="toy-input h-12 w-full"
                  type="number"
                  min="0.000001"
                  max="100000"
                  step="0.000001"
                  inputMode="decimal"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  data-testid="input-sandbox-quantity"
                />
              </label>
              <div className="flex items-center justify-between rounded-2xl bg-accent/20 p-3 text-sm font-bold">
                <span>{tr("Estimated trade value", "القيمة التقديرية للصفقة")}</span>
                <span className="font-num">{money(estimatedCost)}</span>
              </div>
              {estimatedCost > book.balance && (
                <p className="text-sm font-bold text-destructive" role="status">
                  {tr("This costs more than your practice balance.", "تكلفة هذه الصفقة أعلى من رصيد التدريب.")}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <ToyButton
                  variant="secondary"
                  disabled={!selectedStock || !validQuantity || estimatedCost > book.balance || trade.isPending}
                  onClick={() => placeTrade("buy")}
                  data-testid="button-sandbox-buy"
                >
                  <ArrowUpFromLine className="h-4 w-4" />{tr("Practice buy", "شراء تدريبي")}
                </ToyButton>
                <ToyButton
                  variant="outline"
                  disabled={!selectedStock || !validQuantity || !currentHolding || amount > (currentHolding?.quantity ?? 0) || trade.isPending}
                  onClick={() => placeTrade("sell")}
                  data-testid="button-sandbox-sell"
                >
                  <ArrowDownToLine className="h-4 w-4" />{tr("Practice sell", "بيع تدريبي")}
                </ToyButton>
              </div>
            </>
          )}
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-extrabold">{tr("My practice portfolio", "محفظة التدريب")}</h2>
              <p className="text-xs font-bold text-muted-foreground">{tr("Separate from the family-approved portfolio.", "منفصلة عن محفظة العائلة المعتمدة.")}</p>
            </div>
            <Chip tone="secondary">{tr("Practice", "تدريب")}</Chip>
          </div>
          {!book.holdings.length ? (
            <EmptyState icon={<Sprout className="h-8 w-8" />} title={tr("Your practice garden is ready", "حديقة تدريبك جاهزة")} body={tr("Choose a company and try your first simulated buy.", "اختر شركة وجرّب أول عملية شراء افتراضية.")} />
          ) : (
            <ul className="space-y-3">
              {book.holdings.map((holding) => {
                const stock = market.data?.find((item) => item.symbol === holding.symbol);
                const value = holding.quantity * (stock?.price ?? holding.avgBuyPrice);
                return (
                  <li key={holding.symbol} className="flex items-center gap-3 rounded-2xl border border-border p-3">
                    <TickerBlock symbol={holding.symbol} size={42} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-extrabold">{holding.companyName} · {holding.symbol}</p>
                      <p className="font-num text-xs font-bold text-muted-foreground">
                        {num(holding.quantity, 6)} {tr("shares", "سهم")} · {tr("average", "متوسط")} {money(holding.avgBuyPrice)}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className="font-num font-bold">{money(value)}</p>
                      <p className="text-[11px] font-bold text-muted-foreground">{stock ? tr("market value", "قيمة السوق") : tr("cost basis", "تكلفة الشراء")}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <Panel>
        <h2 className="mb-3 font-display text-xl font-extrabold">{tr("Practice history", "سجل التدريب")}</h2>
        {!book.trades.length ? (
          <p className="text-sm font-semibold text-muted-foreground">{tr("Your practice buys and sells will appear here.", "ستظهر عمليات الشراء والبيع التدريبية هنا.")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {book.trades.slice(0, 10).map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className={`grid h-9 w-9 place-items-center rounded-xl ${item.side === "buy" ? "bg-secondary/20 text-secondary" : "bg-accent/30 text-accent-foreground"}`}>
                  {item.side === "buy" ? <ArrowUpFromLine className="h-4 w-4" /> : <ArrowDownToLine className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-extrabold">{tr(item.side === "buy" ? "Practice buy" : "Practice sell", item.side === "buy" ? "شراء تدريبي" : "بيع تدريبي")} · {item.symbol}</p>
                  <p className="text-xs font-bold text-muted-foreground">{num(item.quantity, 6)} {tr("shares", "سهم")} · {dateTime(item.createdAt)}</p>
                </div>
                <p className="font-num font-bold">{money(item.total)}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Disclaimer />
    </div>
  );
}
