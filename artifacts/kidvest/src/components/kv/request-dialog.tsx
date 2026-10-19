"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDownRight, ArrowUpRight, Send } from "lucide-react";
import { useCreateRequest } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n";
import { Disclaimer, SourceChip, ToyButton, errMsg, useInvalidateFamily } from "@/components/kv/kit";

export type RequestTarget = {
  symbol: string;
  companyName: string;
  price: number;
  source?: string;
  type: "buy" | "sell";
  maxQuantity?: number;
};

export function RequestDialog({ target, onOpenChange }: { target: RequestTarget | null; onOpenChange: (o: boolean) => void }) {
  const { tr, money, num } = useI18n();
  const invalidate = useInvalidateFamily();
  const create = useCreateRequest();
  const [mode, setMode] = useState<"qty" | "amount">("qty");
  const [value, setValue] = useState("1");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (target) { setMode("qty"); setValue("1"); setNote(""); }
  }, [target]);

  if (!target) return null;
  const n = Number(value);
  const quantity = mode === "qty" ? n : target.price > 0 ? Math.floor((n / target.price) * 10000) / 10000 : 0;
  const total = quantity * target.price;
  const tooMany = target.type === "sell" && target.maxQuantity !== undefined && quantity > target.maxQuantity;
  const valid = Number.isFinite(quantity) && quantity > 0 && quantity <= 100000 && !tooMany;
  const sell = target.type === "sell";

  const submit = () => {
    if (!valid) return;
    create.mutate(
      { data: { symbol: target.symbol, quantity, type: target.type, kidNote: note.trim() || undefined } },
      {
        onSuccess: () => {
          toast.success(tr("Request sent to your parent", "أُرسل الطلب إلى والديك"), {
            description: tr("They will review it and leave a comment.", "سيراجعونه ويتركون تعليقًا."),
          });
          invalidate();
          onOpenChange(false);
        },
        onError: (e) => toast.error(tr("Request not sent", "لم يُرسل الطلب"), { description: errMsg(e) }),
      },
    );
  };

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[2rem] border-2 p-0 sm:rounded-[2rem]">
        <div className={cn("rounded-t-[1.9rem] p-6", sell ? "bg-destructive/12" : "bg-secondary/15")}>
          <DialogHeader className="text-start">
            <div className="flex items-center gap-2">
              <span className={cn("grid h-10 w-10 place-items-center rounded-2xl", sell ? "bg-destructive text-destructive-foreground" : "bg-secondary text-secondary-foreground")}>
                {sell ? <ArrowDownRight className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
              </span>
              <SourceChip source={target.source} />
            </div>
            <DialogTitle className="font-display text-2xl font-extrabold">
              {sell ? tr("Ask to sell", "اطلب البيع") : tr("Ask to invest", "اطلب الاستثمار")} {target.symbol}
            </DialogTitle>
            <DialogDescription className="font-semibold">
              {target.companyName} · {money(target.price)} {tr("per share", "للسهم")}
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="flex flex-col gap-4 p-6 pt-4">
          <div role="tablist" className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
            {(["qty", "amount"] as const).map((m) => (
              <button key={m} role="tab" type="button" aria-selected={mode === m}
                onClick={() => { setMode(m); setValue(m === "qty" ? "1" : String(Math.max(1, Math.round(target.price)))); }}
                className={cn("rounded-xl py-2 text-sm font-extrabold transition", mode === m ? "bg-card shadow-[0_2px_8px_hsl(var(--foreground)/0.10)]" : "text-muted-foreground")}
                data-testid={`tab-mode-${m}`}>
                {m === "qty" ? tr("Shares", "أسهم") : tr("Dollar amount", "مبلغ بالدولار")}
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-extrabold">{mode === "qty" ? tr("How many shares?", "كم سهمًا؟") : tr("How many dollars?", "كم دولارًا؟")}</span>
            <input className="toy-input font-num text-xl" inputMode="decimal" type="number" min="0" step="any" value={value} onChange={(e) => setValue(e.target.value)} data-testid="input-request-quantity" />
            {sell && target.maxQuantity !== undefined && (
              <span className={cn("text-xs font-bold", tooMany ? "text-destructive" : "text-muted-foreground")}>
                {tr("You own", "تملك")} {num(target.maxQuantity, 4)} {tr("shares", "سهم")}
              </span>
            )}
          </label>
          <div className="flex items-center justify-between rounded-2xl border-2 border-dashed border-border p-4">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{tr("Estimated", "تقديري")}</p>
              <p className="font-num text-2xl font-bold" data-testid="text-request-total">{money(total)}</p>
            </div>
            <p className="font-num text-sm font-bold text-muted-foreground">{num(quantity, 4)} × {money(target.price)}</p>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-extrabold">{tr("Why this company? (note for your parent)", "لماذا هذه الشركة؟ (ملاحظة لوالديك)")}</span>
            <textarea className="toy-input" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder={tr("I like it because...", "أحبها لأن...")} data-testid="input-request-note" />
          </label>
          <ToyButton size="lg" variant={sell ? "danger" : "secondary"} disabled={!valid || create.isPending} onClick={submit} data-testid="button-submit-request">
            <Send className="h-5 w-5 rtl:-scale-x-100" />
            {create.isPending ? tr("Sending...", "جارٍ الإرسال...") : tr("Send to parent", "أرسل إلى والديك")}
          </ToyButton>
          <Disclaimer className="text-center" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
