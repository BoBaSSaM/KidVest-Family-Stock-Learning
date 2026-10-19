"use client";
import Link from "next/link";
import { ArrowRight, Clock3, Inbox, LineChart, PiggyBank, TrendingUp, UserPlus, Users, Wallet } from "lucide-react";
import { useGetDashboard } from "@workspace/api-client-react";
import { useI18n } from "@/components/i18n";
import {
  Chip, EmptyState, ErrorState, KvAvatar, PageHeader, PageSkeleton, Panel, SignedMoney, StatTile, ToyLink,
} from "@/components/kv/kit";
import { TrendArea } from "@/components/kv/charts";
import { StatusPill, TickerBlock, TypeTag } from "@/components/kv/status";

export default function ParentDashboard() {
  const { tr, money, dateTime } = useI18n();
  const q = useGetDashboard();
  if (q.isLoading) return <PageSkeleton />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const d = q.data;
  const pending = d.requests.filter((r) => r.status === "pending");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={tr("Family HQ", "مقر العائلة")}
        title={tr(`Hello, ${d.user.name.split(" ")[0]}`, `مرحبًا، ${d.user.name.split(" ")[0]}`)}
        sub={tr("Here is where your explorers are, and what they're asking for.", "هنا يظهر مكان مستكشفيك وما يطلبونه.")}
        actions={<>
          <ToyLink href="/parent/requests" variant="accent" data-testid="link-review-requests"><Inbox className="h-5 w-5" />{tr("Review requests", "راجع الطلبات")} {pending.length > 0 && `(${pending.length})`}</ToyLink>
          <ToyLink href="/parent/kids" variant="outline" data-testid="link-add-kid"><UserPlus className="h-5 w-5" />{tr("Add explorer", "أضف مستكشفًا")}</ToyLink>
        </>}
      />

      {(!d.stripeEnabled || d.user.isDemo) && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border-2 border-dashed border-accent bg-accent/15 p-3 text-sm font-bold">
          {d.user.isDemo
            ? tr("Demo family: prices are labeled sample data and wallet credits are virtual.", "عائلة تجريبية: الأسعار بيانات تجريبية موسومة ورصيد المحفظة افتراضي.")
            : tr("Card payments are not connected yet, so real wallet top-ups are unavailable. Nothing will be charged.", "مدفوعات البطاقات غير متصلة بعد، لذا شحن المحفظة غير متاح. لن يُخصم أي مبلغ.")}
          <Chip tone="muted">{tr("Market", "السوق")}: {d.marketSource}</Chip>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={tr("Family portfolios", "محافظ العائلة")} value={money(d.totalValue)} icon={<PiggyBank className="h-5 w-5" />} testId="text-total-value" />
        <StatTile label={tr("Wallet balances", "أرصدة المحافظ")} value={money(d.balance)} icon={<Wallet className="h-5 w-5" />} tone="secondary" testId="text-balance" />
        <StatTile label={tr("Gain / loss", "الربح / الخسارة")} value={<SignedMoney value={d.gainLoss} />} icon={<TrendingUp className="h-5 w-5" />} tone="accent" hint={tr("Virtual, never guaranteed", "افتراضي وغير مضمون")} />
        <StatTile label={tr("Waiting for you", "بانتظارك")} value={d.pendingCount} icon={<Clock3 className="h-5 w-5" />} tone="danger" testId="text-pending-count" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-extrabold">{tr("Invested amount over time", "المبلغ المستثمر عبر الزمن")}</h2>
            <LineChart className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="-mt-2 mb-3 text-xs font-bold text-muted-foreground">{tr("Built from the transaction ledger: total cost put into holdings. This is not market value or performance.", "مبني من سجل المعاملات: إجمالي التكلفة المستثمرة. ليس قيمة سوقية ولا أداءً.")}</p>
          {d.chart.length >= 2 ? (
            <TrendArea points={d.chart} />
          ) : (
            <EmptyState icon={<LineChart className="h-8 w-8" />} title={tr("The ledger is just getting started", "السجل في بدايته")} body={tr("This line is drawn from real deposits and trades. Fund a wallet or approve a request to see it grow.", "يُرسم هذا الخط من الإيداعات والصفقات الفعلية. اشحن محفظة أو وافق على طلب لتراه.")} />
          )}
        </Panel>
        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-extrabold">{tr("Explorers", "المستكشفون")}</h2>
            <Link href="/parent/kids" className="text-sm font-extrabold text-primary" data-testid="link-manage-kids">{tr("Manage", "إدارة")}</Link>
          </div>
          {d.kids.length === 0 ? (
            <EmptyState icon={<Users className="h-8 w-8" />} title={tr("No explorers yet", "لا مستكشفين بعد")} body={tr("Create a login for your child to begin.", "أنشئ حسابًا لطفلك للبدء.")} action={<ToyLink href="/parent/kids" size="sm">{tr("Add explorer", "أضف مستكشفًا")}</ToyLink>} />
          ) : (
            <ul className="space-y-3">
              {d.kids.map((k) => (
                <li key={k.id}>
                  <Link href={`/parent/portfolio?kid=${k.id}`} className="flex items-center gap-3 rounded-2xl border-2 border-border p-3 transition hover:-translate-y-0.5 hover:border-primary" data-testid={`card-kid-${k.id}`}>
                    <KvAvatar avatar={k.avatar} name={k.name} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-extrabold">{k.name}</p>
                      <p className="text-xs font-bold text-muted-foreground">{tr("Wallet", "المحفظة")} {money(k.balance)}</p>
                    </div>
                    <div className="text-end">
                      <p className="font-num font-bold">{money(k.portfolioValue)}</p>
                      <SignedMoney value={k.gainLoss} className="text-xs" />
                    </div>
                    {k.pendingCount > 0 && <span className="grid h-6 min-w-6 place-items-center rounded-full bg-accent px-1 text-xs font-black text-accent-foreground">{k.pendingCount}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-extrabold">{tr("Latest requests", "أحدث الطلبات")}</h2>
            <Link href="/parent/requests" className="inline-flex items-center gap-1 text-sm font-extrabold text-primary">{tr("All", "الكل")}<ArrowRight className="h-4 w-4 rtl:rotate-180" /></Link>
          </div>
          {d.requests.length === 0 ? (
            <EmptyState icon={<Inbox className="h-8 w-8" />} title={tr("Quiet inbox", "صندوق هادئ")} body={tr("When an explorer asks to invest, it lands here.", "عندما يطلب مستكشف الاستثمار، يظهر هنا.")} />
          ) : (
            <ul className="divide-y-2 divide-border">
              {d.requests.slice(0, 5).map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-3">
                  <TickerBlock symbol={r.symbol} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold">{r.kidName} · {r.symbol}</p>
                    <p className="text-xs font-bold text-muted-foreground">{dateTime(r.createdAt)}</p>
                  </div>
                  <TypeTag type={r.type} />
                  <StatusPill status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-extrabold">{tr("Recent activity", "النشاط الأخير")}</h2>
            <Link href="/parent/activity" className="inline-flex items-center gap-1 text-sm font-extrabold text-primary">{tr("Log", "السجل")}<ArrowRight className="h-4 w-4 rtl:rotate-180" /></Link>
          </div>
          {d.activity.length === 0 ? (
            <p className="text-sm font-bold text-muted-foreground">{tr("Nothing yet.", "لا شيء بعد.")}</p>
          ) : (
            <ol className="space-y-3">
              {d.activity.slice(0, 6).map((a) => (
                <li key={a.id} className="flex gap-3">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p className="text-sm font-extrabold">{a.actorName} · {a.action}</p>
                    <p className="text-xs font-semibold text-muted-foreground">{a.details} · {dateTime(a.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </div>
  );
}
