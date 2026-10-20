"use client";

import { Coins, Sparkles } from "lucide-react";
import { useI18n } from "@/components/i18n";

type IslandGrowthProps = {
  xp: number;
  level: number;
  progress: number;
};

export function IslandGrowth({ xp, level, progress }: IslandGrowthProps) {
  const { tr } = useI18n();
  const safeLevel = Math.max(1, Math.floor(level));
  const safeProgress = Math.max(0, Math.min(100, progress));
  const advanced = safeLevel >= 2;
  const flourishing = safeLevel >= 4;
  const legendary = safeLevel >= 7;

  return (
    <section
      className="relative isolate overflow-hidden rounded-[2rem] border-2 border-card-border bg-[linear-gradient(165deg,hsl(var(--primary)/.13),hsl(var(--accent)/.20)_58%,hsl(var(--secondary)/.16))] p-4 shadow-[0_6px_0_hsl(var(--card-border))] sm:p-5"
      aria-label={tr(`Island garden, level ${safeLevel}`, `جزيرة التعلّم، المستوى ${safeLevel}`)}
      data-testid="island-growth"
    >
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">{tr("My learning island", "جزيرة التعلّم")}</p>
          <h2 className="font-display text-xl font-extrabold sm:text-2xl">{tr("Growing with every idea", "تكبر مع كل فكرة جديدة")}</h2>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-card/80 px-3 py-2 font-num text-sm font-bold shadow-sm" data-testid="text-island-xp">
          <Sparkles className="h-4 w-4 text-accent-deep" />{xp} XP
        </span>
      </div>

      <div
        className="relative mx-auto mt-2 aspect-[1.72/1] w-full max-w-[620px]"
        role="img"
        aria-label={tr(
          `A learning island at level ${safeLevel}, ${safeProgress}% to the next level${advanced ? ", with a learning hut" : ""}${flourishing ? ", trees and a lookout" : ""}${legendary ? ", and a lighthouse" : ""}`,
          `جزيرة تعليمية في المستوى ${safeLevel}، التقدم للمستوى التالي ${safeProgress}%${advanced ? "، مع كوخ للتعلّم" : ""}${flourishing ? " وأشجار ومنصة مراقبة" : ""}${legendary ? " ومنارة" : ""}`,
        )}
        data-testid="island-illustration"
      >
        <img
          src="/kidvest-island.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-contain"
        />
        <svg
          viewBox="0 0 600 350"
          className="absolute inset-0 h-full w-full overflow-visible"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <filter id="island-soft-shadow" x="-30%" y="-30%" width="160%" height="170%">
              <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#234653" floodOpacity=".18" />
            </filter>
          </defs>
          {advanced && (
            <g className="island-structure" filter="url(#island-soft-shadow)">
              <path d="M230 204h89v59h-89z" fill="#ffe0a0" stroke="#88553b" strokeWidth="5" strokeLinejoin="round" />
              <path d="m220 207 55-42 55 42z" fill="#e87951" stroke="#88553b" strokeWidth="5" strokeLinejoin="round" />
              <path d="M265 228h20v35h-20z" fill="#80533d" />
              <path d="M240 219h15v15h-15zm55 0h15v15h-15z" fill="#83cee0" stroke="#88553b" strokeWidth="3" />
              <path d="M274 166v-17m0 4h22" stroke="#88553b" strokeWidth="4" strokeLinecap="round" />
            </g>
          )}
          {flourishing && (
            <g className="island-vegetation" filter="url(#island-soft-shadow)">
              <g transform="translate(168 204)">
                <path d="M0 31v35" stroke="#81583b" strokeWidth="8" strokeLinecap="round" />
                <circle cx="0" cy="15" r="19" fill="#4da976" />
                <circle cx="-13" cy="26" r="13" fill="#68be7e" />
                <circle cx="13" cy="27" r="13" fill="#3c9764" />
              </g>
              <g transform="translate(357 200)">
                <path d="M0 33v36" stroke="#81583b" strokeWidth="8" strokeLinecap="round" />
                <circle cx="0" cy="16" r="20" fill="#4da976" />
                <circle cx="-13" cy="27" r="13" fill="#68be7e" />
                <circle cx="13" cy="28" r="13" fill="#3c9764" />
              </g>
              <g transform="translate(206 259)">
                <path d="M0 16q-3-14 0-25m0 18q-13-10-14-18m14 12q12-9 14-18" fill="none" stroke="#39865e" strokeWidth="5" strokeLinecap="round" />
                <circle cx="-12" cy="-9" r="5" fill="#f2bc4b" /><circle cx="13" cy="-13" r="5" fill="#ef8465" />
              </g>
              <g transform="translate(336 268)">
                <path d="M0 13q-3-12 0-22m0 15q-12-8-13-15m13 9q12-8 13-16" fill="none" stroke="#39865e" strokeWidth="5" strokeLinecap="round" />
                <circle cx="-11" cy="-9" r="5" fill="#ef8465" /><circle cx="12" cy="-13" r="5" fill="#f2bc4b" />
              </g>
            </g>
          )}
          {legendary && (
            <g className="island-lighthouse" filter="url(#island-soft-shadow)">
              <path d="M397 172h37l-5 77h-27z" fill="#f3f1dc" stroke="#775440" strokeWidth="4" strokeLinejoin="round" />
              <path d="M394 174h43l-7-14h-29z" fill="#df7758" stroke="#775440" strokeWidth="4" strokeLinejoin="round" />
              <path d="M406 157v-15h18v15" fill="#f2c35a" stroke="#775440" strokeWidth="4" />
              <path d="M411 185h10v14h-10z" fill="#83cee0" />
              <path d="M402 210h10v14h-10zM420 210h10v14h-10z" fill="#83cee0" />
              <path d="M390 167h-27m77 0h28" stroke="#f6ce70" strokeWidth="5" strokeLinecap="round" opacity=".85" />
            </g>
          )}
        </svg>
        {!advanced && (
          <div className="absolute bottom-[12%] start-1/2 -translate-x-1/2 rounded-full border border-card/80 bg-card/90 px-3 py-1 text-xs font-extrabold text-foreground shadow-sm">
            <Coins className="me-1 inline h-3.5 w-3.5 text-accent-deep" />
            {safeLevel === 1 ? tr("First seeds", "البذور الأولى") : tr("New growth ahead", "نمو جديد قريبًا")}
          </div>
        )}
      </div>

      <div className="relative z-10 mt-1">
        <div className="mb-1 flex items-center justify-between gap-3 text-xs font-extrabold text-muted-foreground">
          <span>{tr(`Level ${safeLevel}`, `المستوى ${safeLevel}`)}</span>
          <span>{tr(`${safeProgress}% to next level`, `${safeProgress}% للمستوى التالي`)}</span>
        </div>
        <div
          className="h-3 overflow-hidden rounded-full bg-card/75 ring-1 ring-border/70"
          role="progressbar"
          aria-label={tr(`Progress to level ${safeLevel + 1}`, `التقدم إلى المستوى ${safeLevel + 1}`)}
          aria-valuenow={safeProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          data-testid="progress-island-growth"
        >
          <div className="h-full rounded-full bg-secondary transition-[width] duration-500" style={{ width: `${safeProgress}%` }} />
        </div>
      </div>
    </section>
  );
}
