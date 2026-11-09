"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Ticket, LogOut, Shield, LoaderCircle, BarChart3, BrainCircuit } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { LangToggle } from "@/components/lang-toggle";
import { NotificationsBell } from "@/components/app/notifications-bell";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiFetch } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";
import type { SessionUser } from "@/lib/auth";

interface AppShellProps {
  user: SessionUser;
  children: React.ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLang();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST", json: {} });
      toast.success(t("nav.signedOut"));
      router.push("/login");
      router.refresh();
    } catch {
      toast.error(t("nav.signoutFail"));
      setLoggingOut(false);
    }
  }

  function navClass(active: boolean) {
    return active
      ? "rounded-md bg-surface-2 px-3 py-1.5 text-foreground"
      : "rounded-md px-3 py-1.5 text-muted transition-colors hover:text-foreground";
  }

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md shadow-[0_1px_2px_rgba(13,18,38,0.03),0_8px_24px_-10px_rgba(37,51,116,0.14)]">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-[15px] font-semibold tracking-tight"
          >
            <span className="bg-gradient-primary flex h-7 w-7 items-center justify-center rounded-lg text-white elev-card">
              <Ticket size={15} />
            </span>
            DymTicket
          </Link>

          <nav className="ml-2 hidden items-center gap-1 text-[13px] sm:flex">
            <Link href="/dashboard" className={navClass(pathname === "/dashboard")}>
              {t("nav.projects")}
            </Link>
            {user.globalRole !== "client" && (
              <>
                <Link href="/analytics" className={navClass(pathname.startsWith("/analytics"))}>
                  <span className="flex items-center gap-1.5">
                    <BarChart3 size={13} />
                    {t("nav.analytics")}
                  </span>
                </Link>
                <Link href="/knowledge" className={navClass(pathname.startsWith("/knowledge"))}>
                  <span className="flex items-center gap-1.5">
                    <BrainCircuit size={13} />
                    {t("nav.knowledge")}
                  </span>
                </Link>
              </>
            )}
            {user.globalRole === "admin" && (
              <Link href="/admin" className={navClass(pathname.startsWith("/admin"))}>
                {t("nav.admin")}
              </Link>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <NotificationsBell user={user} />
            <LangToggle />
            <ThemeToggle />
            <Menu>
              <MenuTrigger
                className="flex items-center gap-2 rounded-full pr-2 outline-none transition-opacity hover:opacity-85"
                aria-label={t("nav.accountMenu")}
              >
                <Avatar name={user.name} email={user.email} size="sm" />
                <span className="hidden text-[13px] text-foreground sm:inline">
                  {user.name}
                </span>
              </MenuTrigger>
              <MenuContent align="end">
                <MenuLabel>
                  <span className="block truncate">{user.name}</span>
                  <span className="block truncate text-[11px] font-normal text-muted">
                    {user.email}
                  </span>
                </MenuLabel>
                <MenuSeparator />
                {user.globalRole === "admin" && (
                  <MenuItem onSelect={() => router.push("/admin")}>
                    <Shield size={13} className="text-muted" />
                    {t("nav.adminConsole")}
                  </MenuItem>
                )}
                <MenuItem
                  danger
                  onSelect={() => {
                    void logout();
                  }}
                >
                  {loggingOut ? (
                    <LoaderCircle size={13} className="animate-spin" />
                  ) : (
                    <LogOut size={13} />
                  )}
                  {t("nav.signout")}
                </MenuItem>
              </MenuContent>
            </Menu>
          </div>
        </div>
      </header>

      {/* Phone-only compact nav: the desktop links hide below sm, so keep a
          scrollable chip strip here (sticky under the header, board included
          so full-bleed pages can navigate too). */}
      <nav
        className="sticky top-14 z-30 border-b border-border/50 bg-background/85 backdrop-blur-md sm:hidden"
        aria-label={t("nav.projects")}
        data-testid="mobile-nav"
      >
        <div className="scrollbar-stable mx-auto flex w-full max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2">
          {[
            { href: "/dashboard", icon: <Ticket size={13} />, label: t("nav.projects"), active: pathname === "/dashboard" },
            ...(user.globalRole !== "client"
              ? [
                  { href: "/analytics", icon: <BarChart3 size={13} />, label: t("nav.analytics"), active: pathname.startsWith("/analytics") },
                  { href: "/knowledge", icon: <BrainCircuit size={13} />, label: t("nav.knowledge"), active: pathname.startsWith("/knowledge") },
                ]
              : []),
            ...(user.globalRole === "admin"
              ? [{ href: "/admin", icon: <Shield size={13} />, label: t("nav.admin"), active: pathname.startsWith("/admin") }]
              : []),
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "press flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] transition-colors",
                item.active
                  ? "bg-surface-2 font-medium text-foreground"
                  : "text-muted hover:text-foreground",
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Board routes go full-bleed (Trello-style background); every other
          route keeps the centered 7xl container. */}
      <main
        className={
          pathname.startsWith("/projects/")
            ? "flex min-h-0 flex-1 flex-col"
            : "mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6"
        }
      >
        {children}
      </main>
    </div>
  );
}
