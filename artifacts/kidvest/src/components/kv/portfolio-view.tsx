"use client";
import type { ReactNode } from "react";
import { ArrowDownRight, Coins, PiggyBank, Receipt, TrendingUp, Wallet } from "lucide-react";
import type { Holding, Portfolio, Transaction } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n";
import { Chip, EmptyState, Panel, SignedMoney, StatTile, ToyButton } from "@/components/kv/kit";
import { AllocationDonut, PALETTE } from "@/components/kv/charts";
import { TickerBlock } from "@/components/kv/status";

export function PortfolioView({ portfolio, onSell, emptyIcon, emptyAction }: { portfolio: Portfolio; onSell?: (h: Holding) => void; emptyIcon: ReactNode; emptyAction?: ReactNode }) {
  const { tr, money, num, pct } = useI18n();
  const p = portfolio;
  const alloc = p.holdings.filter((h) => h.value > 0).map((h) => ({ name: h.symbol, value: h.value }));
  const total = alloc.reduce((a, b) => a + b.value, 0);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={tr("Holdings value", "قيمة الحيازات")} value={money(p.totalValue)} icon={<PiggyBank className="h-5 w-5" />} testId="text-portfolio-value" />
        <StatTile label={tr("Total cost", "إجمالي التكلفة")} value={money(p.totalCost)} icon={<Coins className="h-5 w-5" />} tone="muted" />
        <StatTile label={tr("Gain / loss", "الربح / الخسارة")} value={<SignedMoney value={p.gainLoss} />} icon={<TrendingUp className="h-5 w-5" />} tone="accent" hint={tr("Virtual. Not guaranteed.", "افتراضي. غير مضمون.")} />
        <StatTile label={tr("Wallet", "المحفظة")} value={money(p.balance)} icon={<Wallet className="h-5 w-5" />} tone="secondary" testId="text-wallet-balance" />
      </div>
      {p.holdings.length === 0 ? (
        <EmptyState icon={emptyIcon} title={tr("No holdings yet", "لا حيازات بعد")} body={tr("Approved buy requests show up here.", "تظهر طلبات الشراء المقبولة هنا.")} action={emptyAction} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <Panel>
            <h2 className="font-display text-xl font-extrabold">{tr("Mix", "التوزيع")}</h2>
            <AllocationDonut data={alloc} />
            <ul className="mt-2 space-y-2">
              {alloc.map((a, i) => (
                <li key={a.name} className="flex items-center gap-2 text-sm font-bold">
                  <span className="h-3 w-3 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                  <span className="flex-1">{a.name}</span>
                  <span className="font-num">{num(total ? (a.value / total) * 100 : 0, 1)}%</span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel className="p-0 md:p-0">
            <h2 className="p-5 pb-2 font-display text-xl font-extrabold">{tr("Holdings", "الحيازات")}</h2>
            <ul className="divide-y-2 divide-border">
              {p.holdings.map((h) => (
                <li key={h.id} className="flex flex-wrap items-center gap-3 px-5 py-4" data-testid={`row-holding-${h.symbol}`}>
                  <TickerBlock symbol={h.symbol} />
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold">{h.symbol} {h.source === "demo" && <Chip tone="accent" className="ms-1">{tr("demo", "تجريبي")}</Chip>}</p>
                    <p className="truncate text-xs font-bold text-muted-foreground">{h.companyName} · {num(h.quantity, 4)} {tr("sh", "سهم")} · {tr("avg", "متوسط")} {money(h.avgBuyPrice)}</p>
                  </div>
                  <div className="text-end">
                    <p className="font-num font-bold">{money(h.value)}</p>
                    <p className="text-xs"><SignedMoney value={h.gainLoss} /> <span className={cn("font-num font-bold", h.changePercent >= 0 ? "text-secondary" : "text-destructive")}>{pct(h.changePercent)}</span></p>
                  </div>
                  {onSell && (
                    <ToyButton size="sm" variant="outline" onClick={() => onSell(h)} data-testid={`button-sell-${h.symbol}`}><ArrowDownRight className="h-4 w-4" />{tr("Ask to sell", "اطلب البيع")}</ToyButton>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}
      <LedgerList history={p.history} />
    </div>
  );
}

export function LedgerList({ history, showKid }: { history: Transaction[]; showKid?: boolean }) {
  const { tr, money, dateTime } = useI18n();
  const names: Record<string, string> = { deposit: tr("Deposit", "إيداع"), purchase: tr("Purchase", "شراء"), sale: tr("Sale", "بيع"), refund: tr("Refund", "استرداد") };
  return (
    <Panel>
      <h2 className="mb-3 font-display text-xl font-extrabold">{tr("Ledger", "السجل")}</h2>
      {history.length === 0 ? (
        <p className="text-sm font-bold text-muted-foreground">{tr("No transactions yet.", "لا معاملات بعد.")}</p>
      ) : (
        <ul className="divide-y-2 divide-border">
          {history.map((t) => {
            const inflow = t.type === "deposit" || t.type === "sale" || t.type === "refund";
            return (
              <li key={t.id} className="flex flex-wrap items-center gap-3 py-3" data-testid={`row-tx-${t.id}`}>
                <span className={cn("grid h-10 w-10 place-items-center rounded-2xl", inflow ? "bg-secondary/15 text-secondary" : "bg-primary/12 text-primary")}><Receipt className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold">{names[t.type] ?? t.type}{showKid && ` · ${t.kidName}`}</p>
                  <p className="text-xs font-bold text-muted-foreground">{dateTime(t.createdAt)} · {t.status}</p>
                </div>
                {t.isDemo && <Chip tone="accent">{tr("Virtual credit", "رصيد افتراضي")}</Chip>}
                {t.receiptUrl && <a href={t.receiptUrl} target="_blank" rel="noreferrer" className="text-xs font-extrabold text-primary underline">{tr("Receipt", "الإيصال")}</a>}
                <span className={cn("font-num font-bold", inflow ? "text-secondary" : "text-foreground")}>{inflow ? "+" : "-"}{money(Math.abs(t.amount))}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
