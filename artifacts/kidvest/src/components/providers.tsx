"use client";
import { SessionProvider, useSession } from "next-auth/react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { I18nProvider, useI18n } from "@/components/i18n";
import { TooltipProvider } from "@/components/ui/tooltip";

function CacheGuard() {
  const { data, status } = useSession();
  const qc = useQueryClient();
  const prev = useRef<string | null | undefined>(undefined);
  const id = data?.user ? ((data.user as { id?: string }).id ?? null) : null;
  useEffect(() => {
    if (status === "loading") return;
    if (prev.current !== undefined && prev.current !== id) qc.clear();
    prev.current = id;
  }, [id, status, qc]);
  return null;
}

function Toasts() {
  const { dir } = useI18n();
  return (
    <Toaster
      dir={dir}
      position="top-center"
      richColors
      toastOptions={{ className: "!rounded-2xl !border-2 !font-bold" }}
    />
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: true } } }),
  );
  return (
    <SessionProvider>
      <QueryClientProvider client={qc}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <I18nProvider>
            <TooltipProvider>
              <CacheGuard />
              {children}
              <Toasts />
            </TooltipProvider>
          </I18nProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
