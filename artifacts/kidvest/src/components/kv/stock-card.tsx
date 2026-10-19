"use client";
import Link from "next/link";
import type { Stock } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n";
import { Chip } from "@/components/kv/kit";
import { TickerBlock } from "@/components/kv/status";

export function StockCard({ s, i = 0 }: { s: Stock; i?: number }) {
  const { tr, money, pct } = useI18n();
  const up = s.changePercent >= 0;
  return (
    <Link href={`/kid/stocks/${encodeURIComponent(s.symbol)}`} data-testid={`card-stock-${s.symbol}`}
      className="toy-card kv-rise group flex flex-col gap-3 p-5 transition hover:-translate-y-1 hover:border-primary" style={{ animationDelay: `${i * 40}ms` }}>
      <div className="flex items-center gap-3">
        <TickerBlock symbol={s.symbol} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-extrabold">{s.symbol}</p>
          <p className="truncate text-xs font-bold text-muted-foreground">{s.name}</p>
        </div>
        {s.source === "demo" && <Chip tone="accent">{tr("demo", "تجريبي")}</Chip>}
      </div>
      {s.summary && <p className="line-clamp-2 text-sm font-semibold text-muted-foreground">{s.summary}</p>}
      <div className="mt-auto flex items-end justify-between">
        <span className="font-num text-xl font-bold">{money(s.price)}</span>
        <span className={cn("rounded-xl px-2 py-0.5 font-num text-sm font-bold", up ? "bg-secondary/15 text-secondary" : "bg-destructive/12 text-destructive")}>{pct(s.changePercent)}</span>
      </div>
    </Link>
  );
}
