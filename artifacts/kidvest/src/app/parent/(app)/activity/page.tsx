"use client";
import { useMemo, useState } from "react";
import { History, Search } from "lucide-react";
import { getGetActivityQueryKey, useGetActivity } from "@workspace/api-client-react";
import { useI18n } from "@/components/i18n";
import { EmptyState, ErrorState, PageHeader, Panel, Skel } from "@/components/kv/kit";

export default function ActivityPage() {
  const { tr, date, dateTime } = useI18n();
  const q = useGetActivity({ query: { refetchInterval: 30_000, queryKey: getGetActivityQueryKey() } });
  const [term, setTerm] = useState("");
  const groups = useMemo(() => {
    const t = term.toLowerCase();
    const items = (q.data ?? []).filter((a) => !t || `${a.action} ${a.details} ${a.actorName}`.toLowerCase().includes(t));
    const m = new Map<string, typeof items>();
    for (const a of items) {
      const k = a.createdAt.slice(0, 10);
      m.set(k, [...(m.get(k) ?? []), a]);
    }
    return [...m.entries()];
  }, [q.data, term]);

  return (
    <div>
      <PageHeader eyebrow={tr("Audit log", "سجل التدقيق")} title={tr("Everything that happened", "كل ما حدث")} sub={tr("Logins, requests, approvals and wallet changes, in order.", "عمليات الدخول والطلبات والموافقات وتغييرات المحفظة بالترتيب.")} />
      <label className="relative mb-5 block max-w-md">
        <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input className="toy-input ps-11" placeholder={tr("Filter the log", "صفِّ السجل")} value={term} onChange={(e) => setTerm(e.target.value)} aria-label={tr("Filter", "تصفية")} data-testid="input-filter-activity" />
      </label>
      {q.isLoading ? <Skel className="h-96 rounded-[1.75rem]" /> : q.error ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : groups.length === 0 ? (
        <EmptyState icon={<History className="h-8 w-8" />} title={tr("Nothing logged", "لا شيء مسجل")} />
      ) : (
        <div className="space-y-6">
          {groups.map(([day, items]) => (
            <Panel key={day}>
              <h2 className="mb-4 font-display text-lg font-extrabold">{date(day)}</h2>
              <ol className="relative space-y-4 border-s-2 border-dashed border-border ps-6">
                {items.map((a) => (
                  <li key={a.id} className="relative" data-testid={`row-activity-${a.id}`}>
                    <span className="absolute -start-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-card bg-primary" />
                    <p className="font-extrabold">{a.action} <span className="font-bold text-muted-foreground">· {a.actorName}</span></p>
                    <p className="text-sm font-semibold text-muted-foreground">{a.details}</p>
                    <p className="font-num text-xs font-bold text-muted-foreground">{dateTime(a.createdAt)}</p>
                  </li>
                ))}
              </ol>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
