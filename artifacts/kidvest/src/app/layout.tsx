import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "../index.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "KidVest - Family investing adventures",
  description:
    "Kids discover real companies and request virtual investments while parents guide every decision. Educational use only. Not financial advice.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body className="min-h-[100dvh]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
