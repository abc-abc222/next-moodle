"use client";

import {
  Bell,
  Books,
  CalendarDots,
  ChatCircleDots,
  House,
} from "@phosphor-icons/react";
import { usePathname } from "next/navigation";

import { TransitionLink } from "./transitions";
import { classNames } from "@/components/ui/class-names";

const NAV_ITEMS = [
  { href: "/dashboard", icon: House, id: "home", label: "ホーム" },
  { href: "/courses", icon: Books, id: "courses", label: "コース" },
  { href: "/calendar", icon: CalendarDots, id: "calendar", label: "予定" },
  { href: "/messages", icon: ChatCircleDots, id: "messages", label: "メッセージ" },
  { href: "/notifications", icon: Bell, id: "notifications", label: "通知" },
] as const;

function isCurrentPath(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
}

export function AppNavigation({ mobile = false }: Readonly<{ mobile?: boolean }>) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={mobile ? "モバイル主要ナビゲーション" : "主要ナビゲーション"}
      className={classNames(
        "ui-app-nav",
        mobile
          ? "ui-app-nav--mobile grid min-w-0 grid-cols-5 gap-0 border-t border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-primary)_94%,transparent)] px-1 pt-1 pb-[max(.25rem,env(safe-area-inset-bottom))] shadow-[0_-12px_32px_rgb(10_8_5_/_8%)] backdrop-blur-xl md:hidden"
          : "grid content-start gap-1",
      )}
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const current = isCurrentPath(pathname, item.href);
        return (
          <TransitionLink
            aria-current={current ? "page" : undefined}
            className={classNames(
              "ui-app-nav__link group relative flex min-h-11 min-w-0 items-center gap-3 rounded-[var(--shape-control)] px-3 py-2 text-xs font-semibold no-underline transition-colors duration-[120ms]",
              mobile && "min-h-[3.5rem] flex-col justify-center gap-0.5 px-1 py-1 text-[.6875rem]",
              current
                ? "bg-[var(--surface-selected)] text-[var(--accent-400)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]",
            )}
            href={item.href}
            intent="switch"
            key={item.href}
            title={mobile ? undefined : item.label}
          >
            <span aria-hidden className="ui-app-nav__icon grid size-[1.3125rem] shrink-0 place-items-center leading-none" data-testid={`primary-nav-${item.id}-icon`}><Icon aria-hidden className="block size-[1.3125rem] shrink-0" size={21} weight={current ? "fill" : "regular"} /></span>
            <span className={classNames("min-w-0 truncate", !mobile && "md:hidden xl:inline")}>{item.label}</span>
            {current ? <span aria-hidden className={classNames("absolute bg-[var(--accent-500)]", mobile ? "inset-x-[30%] -top-1 h-0.5 rounded-b" : "inset-y-2 -left-2 w-[3px] rounded-r")} /> : null}
          </TransitionLink>
        );
      })}
    </nav>
  );
}
