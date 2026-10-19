"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Award, BookOpen, CheckCircle2, Clock3, Crown, Footprints, GraduationCap, Lock, Medal, XCircle } from "lucide-react";
import { getGetDashboardQueryKey, getGetLessonsQueryKey, useCompleteLesson, useGetLessons, type Lesson, type LessonResult } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n";
import { Chip, EmptyState, ErrorState, PageHeader, PageSkeleton, Panel, ToyButton, errMsg } from "@/components/kv/kit";

export default function Learn() {
  const { tr } = useI18n();
  const q = useGetLessons();
  const [open, setOpen] = useState<Lesson | null>(null);
  if (q.isLoading) return <PageSkeleton />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const lessons = q.data;
  const done = lessons.filter((l) => l.completed);
  const categories = [...new Set(lessons.map((l) => l.category))];

  const badges = [
    { icon: Footprints, name: tr("First step", "الخطوة الأولى"), need: tr("Finish 1 lesson", "أنهِ درسًا واحدًا"), got: done.length >= 1 },
    { icon: BookOpen, name: tr("Curious mind", "عقل فضولي"), need: tr("Finish 3 lessons", "أنهِ ٣ دروس"), got: done.length >= 3 },
    { icon: Medal, name: tr("Market scout", "كشّاف السوق"), need: tr("Finish 5 lessons", "أنهِ ٥ دروس"), got: done.length >= 5 },
    { icon: Crown, name: tr("Money sage", "حكيم المال"), need: tr("Finish every lesson", "أنهِ كل الدروس"), got: lessons.length > 0 && done.length === lessons.length },
    ...categories.map((c) => ({ icon: Award, name: c, need: tr(`All ${c} lessons`, `كل دروس ${c}`), got: lessons.filter((l) => l.category === c).every((l) => l.completed) })),
  ];

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={tr("Learn", "تعلّم")} title={tr("Lessons & badges", "الدروس والشارات")} sub={tr(`${done.length} of ${lessons.length} lessons done`, `أنجزت ${done.length} من ${lessons.length} دروس`)} />
      <section>
        <h2 className="mb-4 font-display text-2xl font-extrabold">{tr("Badge shelf", "رف الشارات")}</h2>
        <div className="flex gap-4 overflow-x-auto pb-3">
          {badges.map((b, i) => (
            <div key={b.name + i} className={cn("flex w-36 shrink-0 flex-col items-center gap-2 rounded-[1.5rem] border-2 p-4 text-center", b.got ? "kv-pop border-accent bg-accent/20" : "border-dashed border-border opacity-70")} data-testid={`badge-${i}`}>
              <span className={cn("grid h-14 w-14 place-items-center rounded-full", b.got ? "bg-accent text-accent-foreground shadow-[0_4px_0_hsl(var(--accent-deep))]" : "bg-muted text-muted-foreground")}>
                {b.got ? <b.icon className="h-7 w-7" /> : <Lock className="h-6 w-6" />}
              </span>
              <p className="text-sm font-extrabold">{b.name}</p>
              <p className="text-[11px] font-bold text-muted-foreground">{b.need}</p>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-4 font-display text-2xl font-extrabold">{tr("Lessons", "الدروس")}</h2>
        {lessons.length === 0 ? <EmptyState icon={<GraduationCap className="h-8 w-8" />} title={tr("Lessons are on their way", "الدروس في الطريق")} /> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lessons.map((l, i) => (
              <button key={l.id} type="button" onClick={() => setOpen(l)} data-testid={`card-lesson-${l.id}`}
                className={cn("toy-card kv-rise flex flex-col gap-3 p-5 text-start transition hover:-translate-y-1", l.completed && "border-secondary/60")} style={{ animationDelay: `${i * 40}ms` }}>
                <div className="flex items-center justify-between">
                  <Chip tone="primary">{l.category}</Chip>
                  {l.completed ? <CheckCircle2 className="h-6 w-6 text-secondary" /> : <Chip tone="accent">+{l.xp} XP</Chip>}
                </div>
                <h3 className="font-display text-xl font-extrabold">{l.title}</h3>
                <p className="line-clamp-2 text-sm font-semibold text-muted-foreground">{l.description}</p>
                <p className="mt-auto flex items-center gap-1 text-xs font-bold text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />{l.duration}</p>
              </button>
            ))}
          </div>
        )}
      </section>
      <LessonDialog lesson={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function LessonDialog({ lesson, onClose }: { lesson: Lesson | null; onClose: () => void }) {
  const { tr } = useI18n();
  const qc = useQueryClient();
  const complete = useCompleteLesson();
  const [answer, setAnswer] = useState<number | null>(null);
  const [result, setResult] = useState<LessonResult | null>(null);
  useEffect(() => { setAnswer(null); setResult(null); }, [lesson]);
  if (!lesson) return null;

  const submit = () => {
    if (answer === null) return;
    complete.mutate({ id: lesson.id, data: { answer } }, {
      onSuccess: (r) => {
        setResult(r);
        if (r.correct) {
          toast.success(r.xp ? `+${r.xp} XP` : tr("Correct!", "صحيح!"));
          qc.invalidateQueries({ queryKey: getGetLessonsQueryKey() });
          qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        }
      },
      onError: (e) => toast.error(errMsg(e)),
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] max-w-2xl overflow-y-auto rounded-[2rem] border-2">
        <DialogHeader className="text-start">
          <Chip tone="primary" className="self-start">{lesson.category} · {lesson.duration}</Chip>
          <DialogTitle className="font-display text-3xl font-extrabold">{lesson.title}</DialogTitle>
          <DialogDescription className="font-semibold">{lesson.description}</DialogDescription>
        </DialogHeader>
        <div className="whitespace-pre-line rounded-2xl bg-muted p-5 font-semibold leading-relaxed">{lesson.content}</div>
        <Panel className="flex flex-col gap-3">
          <p className="font-display text-lg font-extrabold">{lesson.question}</p>
          <div className="grid gap-2" role="radiogroup">
            {lesson.options.map((o, i) => (
              <button key={i} type="button" role="radio" aria-checked={answer === i} onClick={() => { setAnswer(i); setResult(null); }} data-testid={`button-option-${i}`}
                className={cn("flex items-center gap-3 rounded-2xl border-2 p-3 text-start font-bold transition", answer === i ? "border-primary bg-primary/10 shadow-[0_3px_12px_hsl(var(--primary)/0.14)]" : "border-border hover:-translate-y-0.5")}>
                <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-xl font-num text-sm", answer === i ? "bg-primary text-primary-foreground" : "bg-muted")}>{String.fromCharCode(65 + i)}</span>{o}
              </button>
            ))}
          </div>
          {result && (
            <div role="status" className={cn("kv-pop flex gap-3 rounded-2xl p-4 font-bold", result.correct ? "bg-secondary/15 text-secondary" : "bg-destructive/12 text-destructive")} data-testid="text-lesson-result">
              {result.correct ? <CheckCircle2 className="h-6 w-6 shrink-0" /> : <XCircle className="h-6 w-6 shrink-0" />}
              <p>{result.message}{result.correct && result.xp > 0 && ` +${result.xp} XP`}</p>
            </div>
          )}
          {result?.correct ? (
            <ToyButton variant="secondary" onClick={onClose} data-testid="button-lesson-done">{tr("Done", "تم")}</ToyButton>
          ) : (
            <ToyButton disabled={answer === null || complete.isPending} onClick={submit} data-testid="button-submit-answer">{complete.isPending ? tr("Checking...", "نتحقق...") : result ? tr("Try again", "حاول مجددًا") : tr("Check answer", "تحقق من الإجابة")}</ToyButton>
          )}
        </Panel>
      </DialogContent>
    </Dialog>
  );
}
