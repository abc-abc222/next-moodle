"use client";

import {
  Bell,
  Certificate,
  ChartBar,
  Files,
  IdentificationCard,
  Keyboard,
  ListChecks,
  UsersThree,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/grades", icon: ChartBar, label: "成績" },
  { href: "/people", icon: UsersThree, label: "参加者" },
  { href: "/files", icon: Files, label: "ファイル" },
  { href: "/badges", icon: Certificate, label: "バッジ" },
  { href: "/plans", icon: ListChecks, label: "学習プラン" },
  { href: "/notifications", icon: Bell, label: "通知" },
  { href: "/profile", icon: IdentificationCard, label: "プロフィール" },
  { href: "/shortcuts", icon: Keyboard, label: "ショートカット" },
] as const;

export function StudentAreaNavigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="学習情報" className="ui-student-area-navigation grid p-2">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        return <Link className="flex min-h-11 items-center gap-2 rounded-[var(--shape-control)] p-2 text-sm text-[var(--text-secondary)] no-underline transition-colors duration-[120ms] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)] aria-[current=page]:bg-[var(--surface-selected)] aria-[current=page]:font-semibold aria-[current=page]:text-[var(--text-primary)]" aria-current={pathname === item.href ? "page" : undefined} href={item.href} key={item.href}><Icon aria-hidden className="shrink-0" size={18} /><span>{item.label}</span></Link>;
      })}
    </nav>
  );
}
