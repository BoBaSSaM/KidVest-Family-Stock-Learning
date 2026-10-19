"use client";
import { CheckCircle2, Clock3, MinusCircle, XCircle } from "lucide-react";
import type { StockRequest } from "@workspace/api-client-react";
import { useI18n } from "@/components/i18n";
import { Chip } from "@/components/kv/kit";

export function StatusPill({ status }: { status: StockRequest["status"] }) {
  const { tr } = useI18n();
  if (status === "approved") return <Chip tone="secondary"><CheckCircle2 className="h-3.5 w-3.5" />{tr("Approved", "مقبول")}</Chip>;
  if (status === "rejected") return <Chip tone="danger"><XCircle className="h-3.5 w-3.5" />{tr("Not this time", "ليس هذه المرة")}</Chip>;
  if (status === "cancelled") return <Chip tone="muted"><MinusCircle className="h-3.5 w-3.5" />{tr("Cancelled", "ملغى")}</Chip>;
  return <Chip tone="accent"><Clock3 className="h-3.5 w-3.5" />{tr("Waiting", "بانتظار")}</Chip>;
}

export function TypeTag({ type }: { type: StockRequest["type"] }) {
  const { tr } = useI18n();
  return type === "sell"
    ? <Chip tone="danger">{tr("Sell", "بيع")}</Chip>
    : <Chip tone="primary">{tr("Buy", "شراء")}</Chip>;
}

export function TickerBlock({ symbol, size = 44 }: { symbol: string; size?: number }) {
  const hue = [...symbol].reduce((a, c) => a + c.charCodeAt(0) * 13, 0) % 360;
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-2xl font-num text-xs font-bold"
      style={{ width: size, height: size, background: `hsl(${hue} 70% 88%)`, color: `hsl(${hue} 60% 25%)`, boxShadow: `0 4px 0 hsl(${hue} 50% 70%)` }}
      aria-hidden
    >
      {symbol.replace(/[-.^=].*$/, "").slice(0, 4)}
    </span>
  );
}
