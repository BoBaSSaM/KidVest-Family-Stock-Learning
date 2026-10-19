"use client";
import { ErrorState } from "@/components/kv/kit";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto grid min-h-[60dvh] max-w-lg place-items-center p-6">
      <ErrorState error={error} onRetry={reset} />
    </div>
  );
}
