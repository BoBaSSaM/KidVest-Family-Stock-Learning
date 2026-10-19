"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Briefcase, Users } from "lucide-react";
import { getGetPortfolioQueryKey, useGetKids, useGetPortfolio } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n";
import { EmptyState, ErrorState, KvAvatar, PageHeader, PageSkeleton, ToyLink } from "@/components/kv/kit";
import { PortfolioView } from "@/components/kv/portfolio-view";

function Inner() {
  const { tr } = useI18n();
  const params = useSearchParams();
  const kids = useGetKids();
  const [kidId, setKidId] = useState<string | null>(params.get("kid"));
  useEffect(() => {
    if (!kidId && kids.data?.length) setKidId(kids.data[0].id);
  }, [kidId, kids.data]);
  const pf = useGetPortfolio({ kidId: kidId ?? undefined }, { query: { enabled: !!kidId, queryKey: getGetPortfolioQueryKey({ kidId: kidId ?? undefined }) } });

  if (kids.isLoading) return <PageSkeleton />;
  if (kids.error) return <ErrorState error={kids.error} onRetry={() => kids.refetch()} />;
  return (
    <div>
      <PageHeader eyebrow={tr("Portfolios", "المحافظ")} title={tr("What each explorer holds", "ما يملكه كل مستكشف")} sub={tr("Virtual holdings, priced from the latest quote. History comes from the real transaction ledger.", "حيازات افتراضية مُسعّرة بآخر سعر. السجل من دفتر المعاملات الفعلي.")} />
      {!kids.data?.length ? (
        <EmptyState icon={<Users className="h-8 w-8" />} title={tr("No explorers yet", "لا مستكشفين بعد")} action={<ToyLink href="/parent/kids" size="sm">{tr("Add explorer", "أضف مستكشفًا")}</ToyLink>} />
      ) : (
        <>
          <div className="mb-6 flex gap-3 overflow-x-auto pb-2" role="tablist" aria-label={tr("Choose explorer", "اختر مستكشفًا")}>
            {kids.data.map((k) => (
              <button key={k.id} role="tab" aria-selected={kidId === k.id} onClick={() => setKidId(k.id)} data-testid={`tab-kid-${k.id}`}
                className={cn("flex shrink-0 items-center gap-2 rounded-2xl border-2 py-2 pe-4 ps-2 font-extrabold transition", kidId === k.id ? "border-primary bg-primary text-primary-foreground shadow-[0_3px_12px_hsl(var(--primary)/0.20)]" : "border-border bg-card hover:-translate-y-0.5")}>
                <KvAvatar avatar={k.avatar} name={k.name} size={32} />{k.name}
              </button>
            ))}
          </div>
          {pf.isLoading || !kidId ? <PageSkeleton /> : pf.error ? <ErrorState error={pf.error} onRetry={() => pf.refetch()} /> : pf.data ? (
            <PortfolioView portfolio={pf.data} emptyIcon={<Briefcase className="h-8 w-8" />} />
          ) : null}
        </>
      )}
    </div>
  );
}

export default function ParentPortfolio() {
  return <Suspense fallback={<PageSkeleton />}><Inner /></Suspense>;
}
