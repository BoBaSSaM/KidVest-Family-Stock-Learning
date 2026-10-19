"use client";
import Link from "next/link";
import { ArrowRight, Coins, Compass, GraduationCap, LineChart, Send, Star, Wallet } from "lucide-react";
import { getGetDashboardQueryKey, useGetDashboard } from "@workspace/api-client-react";
import { useI18n } from "@/components/i18n";
import { Disclaimer, EmptyState, ErrorState, KvAvatar, PageSkeleton, Panel, SignedMoney, StatTile, ToyLink } from "@/components/kv/kit";
import { TrendArea } from "@/components/kv/charts";
import { StatusPill, TickerBlock, TypeTag } from "@/components/kv/status";

export default function KidDashboard() {
  const { tr, money, num } = useI18n();
  const q = useGetDashboard({ query: { refetchInterval: 20_000, queryKey: getGetDashboardQueryKey() } });
  if (q.isLoading) return <PageSkeleton />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const d = q.data;
  const level = Math.floor(d.xp / 100) + 1;
  const into = d.xp % 100;

  return (
    <div className="space-y-6">
      <section className="kv-rise relative overflow-hidden rounded-[2.25rem] bg-primary p-6 text-primary-foreground shadow-[0_10px_0_hsl(var(--primary-deep))] md:p-9">
        <div className="absolute -end-12 -top-12 h-52 w-52 rounded-full bg-white/10" />
        <div className="absolute -bottom-16 end-24 h-40 w-40 rounded-full bg-accent/30" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <KvAvatar avatar={d.user.avatar} name={d.user.name} size={72} />
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] opacity-80">{tr("Explorer", "المستكشف")}</p>
              <h1 className="font-display text-4xl font-extrabold">{tr(`Hi ${d.user.name.split(" ")[0]}!`, `أهلًا ${d.user.name.split(" ")[0]}!`)}</h1>
            </div>
          </div>
          <div className="min-w-[240px] rounded-3xl bg-white/15 p-4">
            <div className="flex items-center justify-between font-extrabold">
              <span className="flex items-center gap-1.5"><Star className="h-5 w-5 fill-accent text-accent" />{tr("Level", "المستوى")} {level}</span>
              <span className="font-num text-sm">{d.xp} XP</span>
            </div>
            <div className="mt-2 h-4 overflow-hidden rounded-full bg-black/20" role="progressbar" aria-valuenow={into} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${into}%` }} />
            </div>
            <p className="mt-1.5 text-xs font-bold opacity-80">{100 - into} XP {tr("to the next level", "للمستوى التالي")}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={tr("My wallet", "محفظتي")} value={money(d.balance)} icon={<Wallet className="h-5 w-5" />} tone="secondary" testId="text-balance" />
        <StatTile label={tr("My backpack", "حقيبتي")} value={money(d.totalValue)} icon={<Coins className="h-5 w-5" />} testId="text-total-value" />
        <StatTile label={tr("Up or down", "صعود أو هبوط")} value={<SignedMoney value={d.gainLoss} />} icon={<LineChart className="h-5 w-5" />} tone="accent" />
        <StatTile label={tr("Lessons done", "دروس منجزة")} value={num(d.completedLessonCount, 0)} icon={<GraduationCap className="h-5 w-5" />} tone="danger" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel>
          <h2 className="font-display text-xl font-extrabold">{tr("Money I've invested", "المال الذي استثمرته")}</h2>
          <p className="mb-3 text-xs font-bold text-muted-foreground">{tr("Total cost from your trades, not how much it's worth today.", "إجمالي تكلفة صفقاتك، وليس قيمتها اليوم.")}</p>
          {d.chart.length >= 2 ? <TrendArea points={d.chart} color="hsl(var(--chart-2))" /> : (
            <EmptyState icon={<Compass className="h-8 w-8" />} title={tr("Your line starts with your first approved request", "يبدأ خطك مع أول طلب مقبول")} action={<ToyLink href="/kid/explore" size="sm" variant="secondary">{tr("Find a company", "ابحث عن شركة")}</ToyLink>} />
          )}
        </Panel>
        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl font-extrabold">{tr("My requests", "طلباتي")}</h2>
            <Link href="/kid/requests" className="inline-flex items-center gap-1 text-sm font-extrabold text-primary">{tr("All", "الكل")}<ArrowRight className="h-4 w-4 rtl:rotate-180" /></Link>
          </div>
          {d.requests.length === 0 ? (
            <EmptyState icon={<Send className="h-8 w-8" />} title={tr("No requests yet", "لا طلبات بعد")} body={tr("Find a company you like and ask your parent.", "اعثر على شركة تحبها واطلب من والديك.")} />
          ) : (
            <ul className="space-y-3">
              {d.requests.slice(0, 5).map((r) => (
                <li key={r.id} className="flex items-center gap-3">
                  <TickerBlock symbol={r.symbol} size={40} />
                  <div className="min-w-0 flex-1"><p className="truncate font-extrabold">{r.symbol}</p><p className="font-num text-xs font-bold text-muted-foreground">{money(r.totalCost)}</p></div>
                  <TypeTag type={r.type} /><StatusPill status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/kid/explore" className="kv-rise flex items-center gap-4 rounded-[1.75rem] bg-accent p-6 text-accent-foreground shadow-[0_5px_16px_hsl(var(--accent-deep)/0.18)] transition hover:-translate-y-0.5" data-testid="link-explore">
          <Compass className="h-10 w-10" /><div><p className="font-display text-2xl font-extrabold">{tr("Go exploring", "انطلق للاستكشاف")}</p><p className="font-semibold">{tr("Search any ticker in the world.", "ابحث عن أي رمز في العالم.")}</p></div>
        </Link>
        <Link href="/kid/learn" className="kv-rise flex items-center gap-4 rounded-[1.75rem] bg-secondary p-6 text-secondary-foreground shadow-[0_5px_16px_hsl(var(--secondary-deep)/0.18)] transition hover:-translate-y-0.5" data-testid="link-learn">
          <GraduationCap className="h-10 w-10" /><div><p className="font-display text-2xl font-extrabold">{tr("Earn XP", "اكسب نقاط الخبرة")}</p><p className="font-semibold">{tr("Quick lessons, one question each.", "دروس سريعة بسؤال واحد.")}</p></div>
        </Link>
      </div>
      <Disclaimer />
    </div>
  );
}
