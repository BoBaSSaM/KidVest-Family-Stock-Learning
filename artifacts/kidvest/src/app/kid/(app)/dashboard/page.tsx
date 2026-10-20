"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, BadgeCheck, Coins, Compass, GraduationCap, LineChart, Send, Sprout, Star, Wallet } from "lucide-react";
import { getGetDashboardQueryKey, getGetRequestsQueryKey, useGetDashboard, useGetRequests } from "@workspace/api-client-react";
import { useI18n } from "@/components/i18n";
import { Celebration } from "@/components/kv/celebration";
import { IslandGrowth } from "@/components/kv/island-growth";
import { Disclaimer, EmptyState, ErrorState, KvAvatar, PageSkeleton, Panel, SignedMoney, StatTile, ToyLink } from "@/components/kv/kit";
import { TrendArea } from "@/components/kv/charts";
import { StatusPill, TickerBlock, TypeTag } from "@/components/kv/status";

export default function KidDashboard() {
  const { tr, money, num } = useI18n();
  const q = useGetDashboard({ query: { refetchInterval: 20_000, queryKey: getGetDashboardQueryKey() } });
  const requests = useGetRequests({ query: { refetchInterval: 15_000, queryKey: getGetRequestsQueryKey() } });
  const seenApproved = useRef<Set<string> | null>(null);
  const [newApproval, setNewApproval] = useState<{ symbol: string } | null>(null);
  useEffect(() => {
    if (!requests.data) return;
    const approved = requests.data.filter((request) => request.status === "approved");
    const current = new Set(approved.map((request) => request.id));
    if (seenApproved.current === null) {
      seenApproved.current = current;
      return;
    }
    const fresh = approved.find((request) => !seenApproved.current?.has(request.id));
    seenApproved.current = current;
    if (fresh) {
      setNewApproval({ symbol: fresh.symbol });
      toast.success(tr("A new adventure reward is ready!", "مكافأة مغامرة جديدة بانتظارك!"));
      void q.refetch();
    }
  }, [requests.data, q.refetch, tr]);
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile label={tr("My wallet", "محفظتي")} value={money(d.balance)} icon={<Wallet className="h-5 w-5" />} tone="secondary" testId="text-balance" />
        <StatTile label={tr("My backpack", "حقيبتي")} value={money(d.totalValue)} icon={<Coins className="h-5 w-5" />} testId="text-total-value" />
        <StatTile label={tr("Up or down", "صعود أو هبوط")} value={<SignedMoney value={d.gainLoss} />} icon={<LineChart className="h-5 w-5" />} tone="accent" />
        <StatTile label={tr("Lessons done", "دروس منجزة")} value={num(d.completedLessonCount, 0)} icon={<GraduationCap className="h-5 w-5" />} tone="danger" />
        <StatTile label={tr("Game coins", "عملات اللعبة")} value={num(d.coins, 0)} icon={<Coins className="h-5 w-5" />} tone="accent" testId="text-game-coins" />
      </div>

      <IslandGrowth xp={d.xp} level={level} progress={into} />

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/kid/explore" className="kv-rise flex items-center gap-4 rounded-[1.75rem] bg-accent p-6 text-accent-foreground shadow-[0_5px_16px_hsl(var(--accent-deep)/0.18)] transition hover:-translate-y-0.5" data-testid="link-explore">
          <Compass className="h-10 w-10" /><div><p className="font-display text-2xl font-extrabold">{tr("Go exploring", "انطلق للاستكشاف")}</p><p className="font-semibold">{tr("Search any ticker in the world.", "ابحث عن أي رمز في العالم.")}</p></div>
        </Link>
        <Link href="/kid/learn" className="kv-rise flex items-center gap-4 rounded-[1.75rem] bg-secondary p-6 text-secondary-foreground shadow-[0_5px_16px_hsl(var(--secondary-deep)/0.18)] transition hover:-translate-y-0.5" data-testid="link-learn">
          <GraduationCap className="h-10 w-10" /><div><p className="font-display text-2xl font-extrabold">{tr("Earn XP", "اكسب نقاط الخبرة")}</p><p className="font-semibold">{tr("Quick lessons, one question each.", "دروس سريعة بسؤال واحد.")}</p></div>
        </Link>
        <Link href="/kid/challenges" className="kv-rise flex items-center gap-4 rounded-[1.75rem] bg-primary p-6 text-primary-foreground shadow-[0_5px_16px_hsl(var(--primary)/0.2)] transition hover:-translate-y-0.5" data-testid="link-challenges">
          <BadgeCheck className="h-10 w-10" /><div><p className="font-display text-2xl font-extrabold">{tr("Try a challenge", "جرّب تحديًا")}</p><p className="font-semibold">{tr("Practice saving and investing.", "تدرّب على الادخار والاستثمار.")}</p></div>
        </Link>
        <Link href="/kid/sandbox" className="kv-rise flex items-center gap-4 rounded-[1.75rem] bg-secondary p-6 text-secondary-foreground shadow-[0_5px_16px_hsl(var(--secondary-deep)/0.18)] transition hover:-translate-y-0.5" data-testid="link-sandbox">
          <Sprout className="h-10 w-10" /><div><p className="font-display text-2xl font-extrabold">{tr("Practice investing", "تدرّب على الاستثمار")}</p><p className="font-semibold">{tr("Use pretend money without approval.", "استخدم أموالًا افتراضية دون موافقة.")}</p></div>
        </Link>
      </div>
      <Panel data-testid="panel-achievements">
        <h2 className="font-display text-xl font-extrabold">{tr("My achievements", "إنجازاتي")}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { name: tr("First lesson", "أول درس"), done: d.completedLessonCount >= 1, progress: tr(`${d.completedLessonCount} lessons`, `${d.completedLessonCount} دروس`) },
            { name: tr("First challenge", "أول تحدٍ"), done: d.completedChallengeCount >= 1, progress: tr(`${d.completedChallengeCount} challenges`, `${d.completedChallengeCount} تحديات`) },
            { name: tr("Parent-approved explorer", "مستكشف بموافقة الوالدين"), done: d.approvedRequestCount >= 1, progress: tr(`${d.approvedRequestCount} approved activities`, `${d.approvedRequestCount} أنشطة مقبولة`) },
          ].map((achievement) => (
            <div key={achievement.name} className={`flex items-center gap-3 rounded-2xl p-3 ${achievement.done ? "bg-accent/30" : "border-2 border-dashed border-border opacity-75"}`}>
              <BadgeCheck className={`h-6 w-6 shrink-0 ${achievement.done ? "text-primary" : "text-muted-foreground"}`} />
              <div><p className="font-extrabold">{achievement.name}</p><p className="text-xs font-bold text-muted-foreground">{achievement.progress}</p></div>
            </div>
          ))}
        </div>
      </Panel>
      <Celebration
        open={newApproval !== null}
        onClose={() => setNewApproval(null)}
        title={tr("Your parent approved your request!", "وافق والداك على طلبك!")}
        description={newApproval ? tr(`Your ${newApproval.symbol} learning activity earned you a reward.`, `حصلت على مكافأة لنشاط التعلّم حول ${newApproval.symbol}.`) : ""}
        xp={25}
        coins={5}
      />
      <Disclaimer />
    </div>
  );
}
