"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Search, SearchX, Sparkles } from "lucide-react";
import { getSearchStocksQueryKey, useGetTrendingStocks, useSearchStocks } from "@workspace/api-client-react";
import { useI18n } from "@/components/i18n";
import { EmptyState, ErrorState, PageHeader, Skel, ToyButton } from "@/components/kv/kit";
import { StockCard } from "@/components/kv/stock-card";

export default function Explore() {
  const { tr } = useI18n();
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => { const t = setTimeout(() => setQ(term.trim()), 350); return () => clearTimeout(t); }, [term]);

  const search = useSearchStocks({ q }, { query: { enabled: q.length > 0, queryKey: getSearchStocksQueryKey({ q }) } });
  const trending = useGetTrendingStocks();

  const openTicker = (e: FormEvent) => {
    e.preventDefault();
    const sym = term.trim().toUpperCase();
    if (sym) router.push(`/kid/stocks/${encodeURIComponent(sym)}`);
  };

  return (
    <div>
      <PageHeader eyebrow={tr("Explore", "استكشف")} title={tr("Which company makes your favorite things?", "أي شركة تصنع أشياءك المفضلة؟")} sub={tr("Type a company name or any ticker symbol, like AAPL or 7203.T.", "اكتب اسم شركة أو أي رمز، مثل AAPL أو 7203.T.")} />
      <form onSubmit={openTicker} className="mb-8 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input className="toy-input h-14 ps-12 text-lg" value={term} onChange={(e) => setTerm(e.target.value)} placeholder={tr("Search companies or tickers", "ابحث عن شركات أو رموز")} aria-label={tr("Search", "بحث")} data-testid="input-search" />
        </label>
        <ToyButton type="submit" size="lg" disabled={!term.trim()} data-testid="button-open-ticker">{tr("Open ticker", "افتح الرمز")}<ArrowRight className="h-5 w-5 rtl:rotate-180" /></ToyButton>
      </form>

      {q && (
        <section className="mb-10">
          <h2 className="mb-4 font-display text-2xl font-extrabold">{tr("Results", "النتائج")}</h2>
          {search.isLoading ? <Grid loading /> : search.error ? <ErrorState error={search.error} onRetry={() => search.refetch()} /> : !search.data?.length ? (
            <EmptyState icon={<SearchX className="h-8 w-8" />} title={tr("No match found", "لا نتائج")} body={tr("Try the exact ticker and press Open ticker. Unknown tickers show a clear error.", "جرّب الرمز الدقيق واضغط افتح الرمز. الرموز غير المعروفة تظهر خطأ واضحًا.")} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{search.data.map((s, i) => <StockCard key={s.symbol} s={s} i={i} />)}</div>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-4 flex items-center gap-2 font-display text-2xl font-extrabold"><Sparkles className="h-6 w-6 text-[hsl(var(--accent-deep))]" />{tr("Popular with explorers", "شائع بين المستكشفين")}</h2>
        {trending.isLoading ? <Grid loading /> : trending.error ? <ErrorState error={trending.error} onRetry={() => trending.refetch()} /> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{(trending.data ?? []).map((s, i) => <StockCard key={s.symbol} s={s} i={i} />)}</div>
        )}
      </section>
    </div>
  );
}

function Grid({ loading }: { loading: boolean }) {
  if (!loading) return null;
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <Skel key={i} className="h-44 rounded-[1.75rem]" />)}</div>;
}
