"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  ArrowRight, BadgeCheck, Compass, GraduationCap, HandCoins, LineChart, Lock, MessageCircleHeart, ShieldCheck, Telescope, Users,
} from "lucide-react";
import { useI18n } from "@/components/i18n";
import { DemoButton } from "@/components/kv/auth";
import { Disclaimer, LangToggle, Logo, ThemeToggle, ToyLink } from "@/components/kv/kit";
import { useKvUser } from "@/components/kv/shell";

export default function Landing() {
  const { tr } = useI18n();
  const { user, status } = useKvUser();
  const router = useRouter();
  useEffect(() => {
    if (status === "authenticated" && user?.role) router.prefetch(`/${user.role}/dashboard`);
  }, [status, user, router]);

  const steps = [
    { icon: Telescope, title: tr("Kid discovers", "الطفل يستكشف"), body: tr("Search any company by ticker, read a kid-sized story about what it makes, and watch its price move.", "ابحث عن أي شركة برمزها، اقرأ قصة مبسطة عمّا تصنعه، وراقب حركة سعرها."), tone: "bg-primary text-primary-foreground" },
    { icon: MessageCircleHeart, title: tr("Kid asks", "الطفل يطلب"), body: tr("Pick shares or a dollar amount, write why, and send the request to a parent.", "اختر عدد الأسهم أو مبلغًا، واكتب السبب، وأرسل الطلب لأحد الوالدين."), tone: "bg-accent text-accent-foreground" },
    { icon: BadgeCheck, title: tr("Parent guides", "الوالد يرشد"), body: tr("Review the latest quote, adjust quantity, approve or decline with a comment.", "راجع آخر سعر، عدّل الكمية، ووافق أو ارفض مع تعليق."), tone: "bg-secondary text-secondary-foreground" },
  ];

  return (
    <div className="min-h-[100dvh] overflow-x-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 md:px-6">
        <Logo />
        <div className="flex items-center gap-2">
          {status === "authenticated" && user ? (
            <ToyLink href={`/${user.role}/dashboard`} size="sm" data-testid="link-continue">
              {tr("Continue", "متابعة")} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </ToyLink>
          ) : (
            <ToyLink href="/parent/login" size="sm" variant="outline" data-testid="link-header-login">{tr("Sign in", "دخول")}</ToyLink>
          )}
          <LangToggle />
          <ThemeToggle />
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-10 pt-6 md:grid-cols-[1.1fr_1fr] md:px-6 md:pt-12">
        <div className="kv-rise">
          <span className="toy-chip bg-accent/40 text-accent-foreground dark:text-accent">{tr("A family money adventure", "مغامرة مالية عائلية")}</span>
          <h1 className="font-display mt-4 text-[2.6rem] font-extrabold leading-[1.02] md:text-7xl">
            {tr("Little investors.", "مستثمرون صغار.")}
            <br />
            <span className="relative inline-block text-primary">
              {tr("Big questions.", "أسئلة كبيرة.")}
              <svg className="absolute -bottom-2 start-0 h-3 w-full text-accent" viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden><path d="M2 9 C 50 2, 150 2, 198 8" stroke="currentColor" strokeWidth="5" fill="none" strokeLinecap="round" /></svg>
            </span>
          </h1>
          <p className="mt-6 max-w-lg text-lg font-semibold text-muted-foreground">
            {tr(
              "العب و اكسب lets children ages 7-12 discover real companies and ask to make virtual investments. Every single decision goes through a parent first.",
              "«العب و اكسب» تتيح للأطفال من ٧ إلى ١٢ عامًا اكتشاف شركات حقيقية وطلب استثمارات افتراضية. وكل قرار يمرّ أولًا عبر أحد الوالدين.",
            )}
          </p>
        </div>
        <div className="relative">
          <div className="absolute inset-6 rounded-full bg-primary/15 blur-3xl" />
          <img src="/kidvest-island.png" alt={tr("A toy island of company towers and coins", "جزيرة ألعاب من أبراج الشركات والعملات")} className="kv-float relative mx-auto w-full max-w-md drop-shadow-[0_24px_30px_hsl(var(--primary)/0.25)]" />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 md:px-6" aria-label={tr("Kids Offer", "عرض الأطفال")}>
        <div className="toy-card grid gap-8 overflow-hidden p-7 md:grid-cols-[1.15fr_0.85fr] md:p-10">
          <div>
            <span className="toy-chip bg-accent/40 text-accent-foreground dark:text-accent">{tr("The Kids Offer", "عرض الأطفال")}</span>
            <h2 className="font-display mt-4 text-3xl font-extrabold md:text-4xl">
              {tr("One offer for kids. Parent dashboard included.", "عرض واحد للأطفال، ولوحة الوالدين مشمولة.")}
            </h2>
            <p className="mt-3 max-w-xl font-semibold text-muted-foreground">
              {tr(
                "Kids get lessons and virtual investing. Parents get the dashboard to create child accounts, set limits and review requests—all included in the same offer.",
                "يحصل الأطفال على الدروس والاستثمار الافتراضي، ويحصل الوالدان على لوحة لإضافة حسابات الأطفال وتحديد الحدود ومراجعة الطلبات—كلها مشمولة في العرض نفسه.",
              )}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
              <ToyLink href="/parent/register" size="lg" data-testid="link-kids-offer">
                {tr("Get started with the Kids Offer", "ابدأ بعرض الأطفال")} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </ToyLink>
              <Link href="/kid/login" className="text-sm font-extrabold text-muted-foreground underline underline-offset-4 hover:text-foreground" data-testid="link-kid-signin">
                {tr("Already have a kid account? Sign in", "لديك حساب طفل؟ سجّل الدخول")}
              </Link>
            </div>
              {status !== "authenticated" && (
                <div className="mt-4 flex flex-wrap gap-2" aria-label={tr("Explore without registering", "استكشف دون تسجيل")}>
                  <DemoButton role="kid" size="sm" testId="button-demo-kid-landing" />
                  <DemoButton role="parent" size="sm" testId="button-demo-parent-landing" />
                </div>
              )}
          </div>
          <ul className="grid content-center gap-3 sm:grid-cols-2 md:grid-cols-1">
            {[
              { icon: Compass, text: tr("A fun learning adventure for kids", "مغامرة تعليمية ممتعة للأطفال") },
              { icon: GraduationCap, text: tr("Lessons and virtual investing", "دروس واستثمار افتراضي") },
              { icon: Users, text: tr("Parent dashboard included", "لوحة الوالدين مشمولة") },
              { icon: BadgeCheck, text: tr("Parent-reviewed requests and limits", "طلبات وحدود يراجعها الوالدان") },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 rounded-2xl bg-secondary/50 p-4 font-extrabold">
                <Icon className="h-5 w-5 shrink-0 text-primary" />{text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 md:px-6">
        <h2 className="font-display text-3xl font-extrabold md:text-5xl">{tr("How one idea travels", "كيف تنتقل الفكرة")}</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-[1fr_1.15fr_1fr]">
          {steps.map((s, i) => (
            <div key={s.title} className={`toy-card kv-rise p-6 ${i === 1 ? "md:-translate-y-6" : ""}`} style={{ animationDelay: `${i * 90}ms` }}>
              <span className={`grid h-14 w-14 place-items-center rounded-2xl ${s.tone}`}><s.icon className="h-7 w-7" /></span>
              <p className="mt-5 font-num text-sm font-bold text-muted-foreground">0{i + 1}</p>
              <h3 className="font-display text-2xl font-extrabold">{s.title}</h3>
              <p className="mt-2 font-semibold text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <div className="grid gap-6 rounded-[2.5rem] bg-secondary p-8 text-secondary-foreground shadow-[0_10px_0_hsl(var(--secondary-deep))] md:grid-cols-2 md:p-12">
          <div>
            <h2 className="font-display text-3xl font-extrabold md:text-4xl">{tr("Learning that levels up", "تعلّم يرفع مستواك")}</h2>
            <p className="mt-3 text-lg font-semibold opacity-90">{tr("Short lessons, one quiz question each, and badges that stack up as explorers learn about saving, risk and diversification.", "دروس قصيرة، بسؤال واحد لكل درس، وشارات تتراكم بينما يتعلم المستكشف عن الادخار والمخاطرة والتنويع.")}</p>
          </div>
          <ul className="grid grid-cols-2 gap-3">
            {[
              { icon: GraduationCap, t: tr("Bite-size lessons", "دروس قصيرة") },
              { icon: LineChart, t: tr("Real price charts", "رسوم أسعار حقيقية") },
              { icon: HandCoins, t: tr("Spending limits", "حدود الإنفاق") },
              { icon: ShieldCheck, t: tr("Parent approval", "موافقة الوالدين") },
            ].map((f) => (
              <li key={f.t} className="flex flex-col gap-2 rounded-3xl bg-white/15 p-4 font-extrabold"><f.icon className="h-6 w-6" />{f.t}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-14 md:grid-cols-3 md:px-6">
        <div className="md:col-span-1">
          <h2 className="font-display text-3xl font-extrabold">{tr("The honest small print", "الشروط بوضوح")}</h2>
        </div>
        <div className="grid gap-4 md:col-span-2 sm:grid-cols-2">
          {[
            [tr("Not a brokerage", "ليست شركة وساطة"), tr("Holdings are virtual and live inside العب و اكسب. Nobody buys a real share.", "الحيازات افتراضية داخل «العب و اكسب». لا يُشترى أي سهم حقيقي.")],
            [tr("No guaranteed returns", "لا عوائد مضمونة"), tr("Prices go up and down. That is the lesson, not a bug.", "الأسعار ترتفع وتنخفض. هذا هو الدرس، وليس خطأ.")],
            [tr("Demo is clearly labeled", "العرض التجريبي موسوم بوضوح"), tr("Demo families use sample prices and virtual credits only.", "العائلات التجريبية تستخدم أسعارًا تجريبية ورصيدًا افتراضيًا فقط.")],
            [tr("Payments stay honest", "مدفوعات صادقة"), tr("Real wallet top-ups need a connected payment provider. We never fake a charge.", "شحن المحفظة الحقيقي يحتاج مزوّد دفع متصل. لا نزيّف أي عملية دفع.")],
          ].map(([t, b]) => (
            <div key={t} className="toy-card p-5">
              <Lock className="h-5 w-5 text-primary" />
              <h3 className="mt-3 font-extrabold">{t}</h3>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">{b}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t-2 border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-6">
          <Logo />
          <Disclaimer className="max-w-xl" />
        </div>
      </footer>
    </div>
  );
}
