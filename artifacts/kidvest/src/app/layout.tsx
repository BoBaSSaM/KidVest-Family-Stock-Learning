import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "../index.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "العب و اكسب — مغامرة مالية للعائلة",
  description:
    "العب و اكسب: تعلّم الادخار والاستثمار الافتراضي مع العائلة، بموافقة الوالدين على كل قرار. للاستخدام التعليمي فقط، وليست نصيحة مالية.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "العب و اكسب",
    description: "مغامرة تعليمية للأطفال لتعلّم الادخار والاستثمار الافتراضي بإشراف الوالدين.",
    locale: "ar",
    type: "website",
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className="min-h-[100dvh]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
