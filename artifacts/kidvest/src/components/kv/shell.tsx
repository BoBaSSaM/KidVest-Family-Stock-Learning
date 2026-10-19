"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, type ReactNode } from "react";
import {
  Briefcase, Compass, GraduationCap, History, Home, Inbox, LayoutGrid, LogOut, PieChart, Repeat, Send, Settings, Users, Wallet,
} from "lucide-react";
import { getGetRequestsQueryKey, useGetRequests } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n";
import { useDemoLaunch } from "@/components/kv/auth";
import { Chip, KvAvatar, LangToggle, Logo, Skel, ThemeToggle, type KvUser } from "@/components/kv/kit";

type Role = "parent" | "kid";

export function useKvUser() {
  const { data, status } = useSession();
  return { user: data?.user as unknown as KvUser | undefined, status };
}

export async function kvSignOut(router: ReturnType<typeof useRouter>) {
  await signOut({ redirect: false });
  router.replace("/");
}

export function RoleShell({ role, children }: { role: Role; children: ReactNode }) {
  const { user, status } = useKvUser();
  const router = useRouter();
  const pathname = usePathname();
  const { tr } = useI18n();

  useEffect(() => {
    if (status === "unauthenticated") router.replace(`/${role}/login`);
    else if (status === "authenticated" && user && user.role !== role) router.replace(`/${user.role}/dashboard`);
  }, [status, user, role, router]);

  const ready = status === "authenticated" && user?.role === role;
  const requests = useGetRequests({
    query: { enabled: ready, refetchInterval: 15_000, queryKey: getGetRequestsQueryKey() },
  });
  const pending = (requests.data ?? []).filter((r) => r.status === "pending").length;

  const nav =
    role === "parent"
      ? [
          { href: "/parent/dashboard", icon: LayoutGrid, label: tr("Family HQ", "مقر العائلة") },
          { href: "/parent/requests", icon: Inbox, label: tr("Requests", "الطلبات"), badge: pending },
          { href: "/parent/kids", icon: Users, label: tr("Kids", "الأطفال") },
          { href: "/parent/portfolio", icon: PieChart, label: tr("Portfolios", "المحافظ") },
          { href: "/parent/payments", icon: Wallet, label: tr("Wallet", "المحفظة") },
          { href: "/parent/activity", icon: History, label: tr("Activity", "النشاط") },
          { href: "/parent/settings", icon: Settings, label: tr("Settings", "الإعدادات") },
        ]
      : [
          { href: "/kid/dashboard", icon: Home, label: tr("My Base", "قاعدتي") },
          { href: "/kid/explore", icon: Compass, label: tr("Explore", "استكشف") },
          { href: "/kid/requests", icon: Send, label: tr("Requests", "طلباتي"), badge: pending },
          { href: "/kid/portfolio", icon: Briefcase, label: tr("Backpack", "حقيبتي") },
          { href: "/kid/learn", icon: GraduationCap, label: tr("Learn", "تعلّم") },
        ];

  if (!ready) {
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-6xl flex-col gap-6 p-6" aria-busy="true">
        <div className="flex items-center justify-between">
          <Logo />
          <Skel className="h-10 w-40" />
        </div>
        <Skel className="h-12 w-72" />
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => <Skel key={i} className="h-36 rounded-[1.75rem]" />)}
        </div>
        <Skel className="h-80 rounded-[1.75rem]" />
      </div>
    );
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/") || (href === "/kid/explore" && pathname.startsWith("/kid/stocks"));

  return (
    <div className="min-h-[100dvh] md:flex">
      <aside className="sticky top-0 hidden h-[100dvh] w-64 shrink-0 flex-col gap-6 border-e-2 border-sidebar-border bg-sidebar p-5 md:flex">
        <Link href={`/${role}/dashboard`} data-testid="link-home"><Logo /></Link>
        <div className={cn("rounded-2xl px-3 py-2 text-xs font-black uppercase tracking-[0.16em]", role === "parent" ? "bg-primary/12 text-primary" : "bg-accent/40 text-accent-foreground dark:text-accent")}>
          {role === "parent" ? tr("Parent cockpit", "لوحة الوالدين") : tr("Explorer mode", "وضع المستكشف")}
        </div>
        <nav className="flex flex-1 flex-col gap-1.5" aria-label={tr("Main", "رئيسي")}>
          {nav.map((n) => {
            const active = isActive(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                data-testid={`link-nav-${n.href.split("/").pop()}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl px-3.5 py-3 font-extrabold transition-transform hover:-translate-y-0.5",
                  active ? "bg-primary text-primary-foreground shadow-[0_3px_12px_hsl(var(--primary)/0.20)]" : "text-sidebar-foreground hover:bg-sidebar-accent",
                )}
              >
                <n.icon className="h-5 w-5" />
                <span className="flex-1">{n.label}</span>
                {!!n.badge && <span className="grid h-6 min-w-6 place-items-center rounded-full bg-accent px-1.5 text-xs font-black text-accent-foreground">{n.badge}</span>}
              </Link>
            );
          })}
        </nav>
        <UserCard user={user} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b-2 border-border bg-background/85 px-4 py-3 backdrop-blur md:px-8">
          <Link href={`/${role}/dashboard`} className="md:hidden"><Logo /></Link>
          <div className="hidden items-center gap-2 md:flex">
            {user.isDemo && <Chip tone="accent">{tr("Demo family - isolated sample data", "عائلة تجريبية - بيانات معزولة")}</Chip>}
          </div>
          <div className="flex items-center gap-2">
            {user.isDemo && <DemoSwitch role={role} />}
            <LangToggle />
            <ThemeToggle />
            <button
              type="button"
              onClick={() => kvSignOut(router)}
              className="toy-btn toy-outline h-9 w-9 rounded-xl px-0 md:hidden"
              aria-label={tr("Sign out", "تسجيل الخروج")}
              data-testid="button-signout-mobile"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        {user.isDemo && (
          <div className="px-4 pt-3 md:hidden"><Chip tone="accent">{tr("Demo family", "عائلة تجريبية")}</Chip></div>
        )}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 md:px-8 md:pb-12">{children}</main>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-40 flex justify-around rounded-3xl border-2 border-border bg-card p-1.5 shadow-[0_6px_0_hsl(var(--border))] md:hidden" aria-label={tr("Main", "رئيسي")}>
        {nav.slice(0, 5).map((n) => {
          const active = isActive(n.href);
          return (
            <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} className={cn("relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-[11px] font-extrabold", active ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
              <n.icon className="h-5 w-5" />
              <span className="truncate">{n.label}</span>
              {!!n.badge && <span className="absolute end-2 top-1 h-2.5 w-2.5 rounded-full bg-accent" />}
            </Link>
          );
        })}
      </nav>
      {role === "parent" && <MobileMore nav={nav.slice(5)} />}
    </div>
  );
}

function MobileMore({ nav }: { nav: { href: string; icon: typeof Home; label: string }[] }) {
  return (
    <div className="fixed bottom-24 end-4 z-40 flex flex-col gap-2 md:hidden">
      {nav.map((n) => (
        <Link key={n.href} href={n.href} aria-label={n.label} className="toy-btn toy-outline h-11 w-11 rounded-2xl px-0">
          <n.icon className="h-5 w-5" />
        </Link>
      ))}
    </div>
  );
}

function UserCard({ user }: { user: KvUser }) {
  const router = useRouter();
  const { tr } = useI18n();
  return (
    <div className="toy-card flex items-center gap-3 p-3">
      <KvAvatar avatar={user.avatar} name={user.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-extrabold" data-testid="text-username">{user.name}</p>
        <p className="text-xs font-bold text-muted-foreground">{user.role === "parent" ? tr("Guide", "مرشد") : tr("Explorer", "مستكشف")}</p>
      </div>
      <button type="button" onClick={() => kvSignOut(router)} aria-label={tr("Sign out", "تسجيل الخروج")} className="toy-btn toy-ghost h-9 w-9 rounded-xl px-0" data-testid="button-signout">
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}

function DemoSwitch({ role }: { role: Role }) {
  const { launch, pending } = useDemoLaunch();
  const { tr } = useI18n();
  const other = role === "parent" ? "kid" : "parent";
  return (
    <button type="button" disabled={pending !== null} onClick={() => launch(other)} className="toy-btn toy-accent h-9 rounded-xl px-3 text-sm" data-testid="button-demo-switch">
      <Repeat className="h-4 w-4" />
      <span className="hidden sm:inline">{pending ? tr("Switching...", "جارٍ التبديل...") : other === "kid" ? tr("View as kid", "اعرض كطفل") : tr("View as parent", "اعرض كوالد")}</span>
    </button>
  );
}
