"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  CircleHelp,
  Coins,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Sprout,
  Target,
  XCircle,
} from "lucide-react";
import {
  getGetChallengesQueryKey,
  getGetDashboardQueryKey,
  useCompleteChallenge,
  useGetChallenges,
  type Challenge,
  type ChallengeResult,
} from "@workspace/api-client-react";
import { useI18n } from "@/components/i18n";
import {
  Chip,
  Disclaimer,
  EmptyState,
  ErrorState,
  PageHeader,
  PageSkeleton,
  Panel,
  ToyButton,
  errMsg,
} from "@/components/kv/kit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function ChallengesPage() {
  const { tr, lang } = useI18n();
  const queryClient = useQueryClient();
  const query = useGetChallenges();
  const completeChallenge = useCompleteChallenge();
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [answer, setAnswer] = useState<number | null>(null);
  const [result, setResult] = useState<ChallengeResult | null>(null);

  useEffect(() => {
    setAnswer(null);
    setResult(null);
  }, [activeChallenge?.id]);

  if (query.isLoading) return <PageSkeleton />;
  if (query.error || !query.data) {
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  }

  const challenges = query.data;
  const completedCount = challenges.filter((challenge) => challenge.completed).length;
  const allComplete = challenges.length > 0 && completedCount === challenges.length;
  const progress = challenges.length ? Math.round((completedCount / challenges.length) * 100) : 0;
  function submitAnswer() {
    if (!activeChallenge || answer === null || completeChallenge.isPending) return;
    completeChallenge.mutate(
      { id: activeChallenge.id, data: { answer } },
      {
        onSuccess: (response) => {
          setResult(response);
          queryClient.invalidateQueries({ queryKey: getGetChallengesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          if (response.correct) {
            toast.success(
              tr(
                `You earned ${response.xp} XP and ${response.coins} coins`,
                `ربحت ${response.xp} نقطة خبرة و${response.coins} عملة`,
              ),
            );
          }
        },
        onError: (error) => toast.error(errMsg(error)),
      },
    );
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={tr("Play & learn", "العب وتعلّم")}
        title={tr("Money missions", "مهمات المال")}
        sub={tr(
          "Make smart choices, learn one idea at a time, and grow your coin collection.",
          "اتخذ قرارات ذكية، وتعلّم فكرة في كل مرة، واجمع المزيد من العملات.",
        )}
      />

      <section className="relative overflow-hidden rounded-[2rem] bg-secondary p-5 text-secondary-foreground shadow-[0_8px_24px_hsl(var(--secondary-deep)/0.18)] sm:p-7" aria-label={tr("Challenge progress", "تقدم التحديات")}>
        <div className="pointer-events-none absolute -end-8 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="relative grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/15"><Target className="h-5 w-5" /></span>
              <Chip className="bg-white/15 text-current">{tr("Your mission board", "لوحة مهماتك")}</Chip>
            </div>
            <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
              {allComplete
                ? tr("Every mission cleared!", "أنهيت كل المهمات!")
                : tr("Small choices. Big money smarts.", "قرارات صغيرة، وذكاء مالي كبير.")}
            </h2>
            <p className="mt-1 max-w-xl font-semibold opacity-85">
              {allComplete
                ? tr("You practiced saving, balancing risk, and spreading choices.", "تدرّبت على الادخار وموازنة المخاطر وتنويع الاختيارات.")
                : tr("Explore saving goals, risk, and why a mix can be stronger than one choice.", "اكتشف أهداف الادخار والمخاطر ولماذا قد يكون التنويع أفضل من اختيار واحد.")}
            </p>
          </div>
          <div className="min-w-[170px] rounded-3xl bg-white/15 p-4" data-testid="challenge-progress-summary">
            <div className="flex items-center justify-between gap-2 text-sm font-extrabold">
              <span>{tr("Missions", "المهمات")}</span>
              <span className="font-num" data-testid="text-challenge-count">{completedCount}/{challenges.length}</span>
            </div>
            <div
              className="mt-2 h-3 overflow-hidden rounded-full bg-black/15"
              role="progressbar"
              aria-label={tr("Challenges completed", "التحديات المكتملة")}
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              data-testid="progress-challenges"
            >
              <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-end text-xs font-bold opacity-85">{progress}%</p>
          </div>
        </div>
      </section>

      {challenges.length === 0 ? (
        <EmptyState
          icon={<CircleHelp className="h-8 w-8" />}
          title={tr("New missions are on their way", "مهمات جديدة في الطريق")}
          body={tr("Check back soon for another money-smart challenge.", "عد قريبًا لتجربة تحدٍ جديد في عالم المال.")}
        />
      ) : allComplete ? (
        <Panel className="flex flex-col items-center gap-3 py-8 text-center" data-testid="state-all-challenges-complete">
          <span className="grid h-16 w-16 place-items-center rounded-3xl bg-accent/40 text-accent-foreground"><Sparkles className="h-8 w-8" /></span>
          <h2 className="font-display text-2xl font-extrabold">{tr("You’re a money mission master", "أصبحت خبير المهمات المالية")}</h2>
          <p className="max-w-lg font-semibold text-muted-foreground">{tr("Every challenge is complete. Keep your learning going with lessons and practice.", "أكملت كل التحديات. واصل التعلم بالدروس والتدريب.")}</p>
        </Panel>
      ) : null}

      {challenges.length > 0 && (
        <section aria-labelledby="challenge-list-title">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">{tr("Choose a mission", "اختر مهمة")}</p>
              <h2 id="challenge-list-title" className="font-display text-2xl font-extrabold">{tr("Your challenge trail", "طريق التحديات")}</h2>
            </div>
            <p className="text-sm font-bold text-muted-foreground">{tr("All investing here is virtual practice.", "كل الاستثمار هنا تدريب افتراضي.")}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {challenges.map((challenge, index) => {
              const title = tr(challenge.title, challenge.titleAr);
              const description = tr(challenge.description, challenge.descriptionAr);
              const category = tr(challenge.category, challenge.categoryAr);
              const Icon = challengeIcon(category, index);
              return (
                <article
                  key={challenge.id}
                  className={cn(
                    "toy-card kv-rise flex min-h-[230px] flex-col gap-4 p-5 transition-transform",
                    challenge.completed && "border-secondary/50",
                  )}
                  style={{ animationDelay: `${index * 55}ms` }}
                  data-testid={`card-challenge-${challenge.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl", challenge.completed ? "bg-secondary/15 text-secondary" : "bg-primary/12 text-primary")}>
                      {challenge.completed ? <CheckCircle2 className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                    </span>
                    <Chip tone={challenge.completed ? "secondary" : "primary"}>{category}</Chip>
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-extrabold leading-snug">{title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold text-muted-foreground">{description}</p>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <Chip tone="accent"><Sparkles className="h-3.5 w-3.5" />{challenge.xp} XP</Chip>
                      <Chip tone="muted"><Coins className="h-3.5 w-3.5" />{challenge.coins}</Chip>
                    </div>
                    {challenge.completed ? (
                      <span className="inline-flex items-center gap-1 text-sm font-extrabold text-secondary" data-testid={`status-challenge-${challenge.id}`}>
                        <CheckCircle2 className="h-4 w-4" />{tr("Done", "مكتملة")}
                      </span>
                    ) : (
                      <ToyButton
                        size="sm"
                        onClick={() => setActiveChallenge(challenge)}
                        data-testid={`button-start-challenge-${challenge.id}`}
                      >
                        {tr("Play", "ابدأ")}
                      </ToyButton>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p className="text-sm font-bold leading-relaxed text-muted-foreground">
            {tr(
              "These missions teach money ideas through pretend examples. No real money or trades are involved.",
              "تعلّمك هذه المهمات أفكارًا مالية بأمثلة افتراضية. لا تُستخدم أموال حقيقية ولا تُنفّذ صفقات فعلية.",
            )}
          </p>
        </div>
      </div>
      <Disclaimer />

      <Dialog open={!!activeChallenge} onOpenChange={(open) => !open && setActiveChallenge(null)}>
        <DialogContent className="max-h-[92dvh] max-w-2xl overflow-y-auto rounded-[2rem] border-2">
          {activeChallenge && (
            <DialogHeader className="text-start">
              <Chip tone="primary" className="self-start">{tr(activeChallenge.category, activeChallenge.categoryAr)}</Chip>
              <DialogTitle className="font-display text-3xl font-extrabold">
                {tr(activeChallenge.title, activeChallenge.titleAr)}
              </DialogTitle>
              <DialogDescription className="font-semibold">
                {tr(activeChallenge.description, activeChallenge.descriptionAr)}
              </DialogDescription>
            </DialogHeader>
          )}
          {activeChallenge && (
            <Panel className="flex flex-col gap-4">
              <p className="font-display text-xl font-extrabold leading-relaxed" data-testid="text-challenge-question">
                {tr(activeChallenge.question, activeChallenge.questionAr)}
              </p>
              <div className="grid gap-2" role="radiogroup" aria-label={tr("Choose your answer", "اختر إجابتك")}>
                {(lang === "ar" ? activeChallenge.optionsAr : activeChallenge.options).map((option, index) => (
                  <button
                    key={`${activeChallenge.id}-option-${index}`}
                    type="button"
                    role="radio"
                    aria-checked={answer === index}
                    onClick={() => { setAnswer(index); setResult(null); }}
                    disabled={activeChallenge.completed || completeChallenge.isPending}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border-2 p-3 text-start font-bold transition",
                      answer === index
                        ? "border-primary bg-primary/10 shadow-[0_3px_12px_hsl(var(--primary)/0.14)]"
                        : "border-border hover:-translate-y-0.5",
                    )}
                    data-testid={`button-challenge-option-${index}`}
                  >
                    <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-xl font-num text-sm", answer === index ? "bg-primary text-primary-foreground" : "bg-muted")}>
                      {String.fromCharCode(65 + index)}
                    </span>
                    {option}
                  </button>
                ))}
              </div>
              {result && (
                <div
                  role="status"
                  className={cn("kv-pop flex flex-col gap-3 rounded-2xl p-4 font-bold sm:flex-row sm:items-start", result.correct ? "bg-secondary/15 text-secondary" : "bg-destructive/10 text-destructive")}
                  data-testid="text-challenge-result"
                >
                  {result.correct ? <CheckCircle2 className="h-6 w-6 shrink-0" /> : <XCircle className="h-6 w-6 shrink-0" />}
                  <div className="flex-1">
                    <p>{result.message}</p>
                    {result.correct && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Chip tone="secondary"><Sparkles className="h-3.5 w-3.5" />+{result.xp} XP</Chip>
                        <Chip tone="accent"><Coins className="h-3.5 w-3.5" />+{result.coins}</Chip>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {activeChallenge.completed && !result && (
                <div className="flex items-center gap-2 rounded-2xl bg-secondary/10 p-4 font-bold text-secondary" role="status">
                  <LockKeyhole className="h-5 w-5" />{tr("This mission is already complete.", "أكملت هذه المهمة من قبل.")}
                </div>
              )}
              {result?.correct ? (
                <ToyButton variant="secondary" onClick={() => setActiveChallenge(null)} data-testid="button-challenge-done">
                  {tr("Back to missions", "العودة للمهمات")}
                </ToyButton>
              ) : (
                <ToyButton
                  disabled={answer === null || completeChallenge.isPending || activeChallenge.completed}
                  onClick={submitAnswer}
                  data-testid="button-submit-challenge"
                >
                  {completeChallenge.isPending
                    ? tr("Checking...", "نتحقق...")
                    : result
                      ? tr("Try again", "حاول مجددًا")
                      : tr("Check my answer", "تحقق من إجابتي")}
                </ToyButton>
              )}
            </Panel>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function challengeIcon(category: string, index: number) {
  const label = category.toLocaleLowerCase();
  if (label.includes("risk") || label.includes("مخاطر")) return ShieldCheck;
  if (label.includes("divers") || label.includes("تنويع")) return Sprout;
  return index % 2 === 0 ? Target : Coins;
}
