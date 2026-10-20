"use client";
import { CheckCircle2, Coins, Sparkles, X } from "lucide-react";
import { useI18n } from "@/components/i18n";
import { ToyButton } from "@/components/kv/kit";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const colors = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--secondary))", "hsl(var(--destructive))"];

export function Celebration({
  open, onClose, title, description, xp, coins,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  xp: number;
  coins: number;
}) {
  const { tr } = useI18n();
  return (
    <Dialog open={open} onOpenChange={(shown) => !shown && onClose()}>
      <DialogContent className="relative overflow-hidden rounded-[2rem] border-2 border-accent p-7 text-center sm:max-w-md">
        <div className="pointer-events-none absolute inset-x-6 top-0 h-32 overflow-hidden" aria-hidden>
          {Array.from({ length: 18 }, (_, i) => (
            <span
              key={i}
              className="kv-confetti-piece"
              style={{
                left: `${(i * 37 + 9) % 100}%`,
                backgroundColor: colors[i % colors.length],
                animationDelay: `${(i % 6) * 90}ms`,
                transform: `rotate(${i * 29}deg)`,
              }}
            />
          ))}
        </div>
        <DialogHeader className="relative items-center pt-7">
          <span className="kv-celebrate-icon mb-2 grid h-20 w-20 place-items-center rounded-full bg-accent/35 text-primary">
            <CheckCircle2 className="h-11 w-11" />
          </span>
          <DialogTitle className="font-display text-2xl font-extrabold">{title}</DialogTitle>
          <DialogDescription className="font-semibold">{description}</DialogDescription>
        </DialogHeader>
        <div className="relative flex justify-center gap-3 py-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-2 font-num font-extrabold text-primary"><Sparkles className="h-4 w-4" />+{xp} XP</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/40 px-4 py-2 font-num font-extrabold"><Coins className="h-4 w-4" />+{coins} {tr("coins", "عملة")}</span>
        </div>
        <ToyButton onClick={onClose} variant="secondary" className="relative w-full" data-testid="button-celebration-close">
          <X className="h-4 w-4" />{tr("Keep exploring", "تابع الاستكشاف")}
        </ToyButton>
      </DialogContent>
    </Dialog>
  );
}
