"use client";
import { Map } from "lucide-react";
import { useI18n } from "@/components/i18n";
import { Logo, ToyLink } from "@/components/kv/kit";

export default function NotFound() {
  const { tr } = useI18n();
  return (
    <div className="grid min-h-[100dvh] place-items-center p-6">
      <div className="toy-card kv-rise flex max-w-md flex-col items-center gap-4 p-10 text-center">
        <Logo />
        <div className="kv-pop grid h-20 w-20 rotate-[-8deg] place-items-center rounded-3xl bg-accent text-accent-foreground shadow-[0_6px_0_hsl(var(--accent-deep))]"><Map className="h-10 w-10" /></div>
        <p className="font-num text-sm font-bold text-muted-foreground">404</p>
        <h1 className="font-display text-3xl font-extrabold">{tr("This spot isn't on the map", "هذا المكان ليس على الخريطة")}</h1>
        <ToyLink href="/" data-testid="link-home">{tr("Back to base", "العودة إلى القاعدة")}</ToyLink>
      </div>
    </div>
  );
}
