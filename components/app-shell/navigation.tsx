"use client";

import {
  Books,
  CalendarDots,
  ChatCircleDots,
  DotsThreeCircle,
  House,
} from "@phosphor-icons/react";
import { usePathname } from "next/navigation";

import { TransitionLink } from "./transitions";

const NAV_ITEMS = [
  { href: "/dashboard", icon: House, label: "ホーム" },
  { href: "/courses", icon: Books, label: "コース" },
  { href: "/calendar", icon: CalendarDots, label: "予定" },
  { href: "/messages", icon: ChatCircleDots, label: "メッセージ" },
  { href: "/profile", icon: DotsThreeCircle, label: "その他" },
] as const;

function isCurrentPath(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
}

export function AppNavigation({ mobile = false }: Readonly<{ mobile?: boolean }>) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={mobile ? "モバイル主要ナビゲーション" : "主要ナビゲーション"}
      className={mobile ? "ui-app-nav ui-app-nav--mobile" : "ui-app-nav"}
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const current = isCurrentPath(pathname, item.href);
        return (
          <TransitionLink
            aria-current={current ? "page" : undefined}
            className="ui-app-nav__link"
            href={item.href}
            intent="switch"
            key={item.href}
            title={mobile ? undefined : item.label}
          >
            <span aria-hidden className="ui-app-nav__icon"><Icon aria-hidden size={21} weight="regular" /></span>
            <span>{item.label}</span>
          </TransitionLink>
        );
      })}
    </nav>
  );
}
