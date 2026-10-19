"use client";
import { useState } from "react";
import { Briefcase } from "lucide-react";
import { useGetPortfolio } from "@workspace/api-client-react";
import { useI18n } from "@/components/i18n";
import { ErrorState, PageHeader, PageSkeleton, ToyLink } from "@/components/kv/kit";
import { PortfolioView } from "@/components/kv/portfolio-view";
import { RequestDialog, type RequestTarget } from "@/components/kv/request-dialog";

export default function KidPortfolio() {
  const { tr } = useI18n();
  const q = useGetPortfolio();
  const [target, setTarget] = useState<RequestTarget | null>(null);
  return (
    <div>
      <PageHeader eyebrow={tr("Backpack", "حقيبتي")} title={tr("Companies I own a piece of", "شركات أملك جزءًا منها")} sub={tr("Virtual shares. Values change with the market and are never guaranteed.", "أسهم افتراضية. القيم تتغير مع السوق وغير مضمونة أبدًا.")} />
      {q.isLoading ? <PageSkeleton /> : q.error || !q.data ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <PortfolioView
          portfolio={q.data}
          emptyIcon={<Briefcase className="h-8 w-8" />}
          emptyAction={<ToyLink href="/kid/explore" size="sm" variant="secondary">{tr("Find a company", "ابحث عن شركة")}</ToyLink>}
          onSell={(h) => setTarget({ symbol: h.symbol, companyName: h.companyName, price: h.currentPrice, source: h.source, type: "sell", maxQuantity: h.quantity })}
        />
      )}
      <RequestDialog target={target} onOpenChange={(o) => !o && setTarget(null)} />
    </div>
  );
}
