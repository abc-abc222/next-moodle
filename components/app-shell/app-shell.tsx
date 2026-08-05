"use client";

import {
  ChartBar,
  File,
  FilePdf,
  GearSix,
  GraduationCap,
  IdentificationCard,
  Lifebuoy,
  Lightning,
  UserCircle,
} from "@phosphor-icons/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { CommandPalette } from "@/components/command-palette/command-palette";
import type { CommandItem } from "@/components/command-palette/search";
import { PopoverMenu, ThemeControl } from "@/components/ui";
import { classNames } from "@/components/ui/class-names";
import type { CommandCourse } from "@/lib/moodle/queries/courses";
import { LogoutButton } from "./logout-button";
import { AppNavigation } from "./navigation";
import { TransitionLink, WorkspaceTransition } from "./transitions";
import type { WorkspaceMode } from "./motion";

const SCREEN_COMMANDS = [
  { href: "/dashboard", keywords: ["home", "next"], kind: "screen", label: "ダッシュボード" },
  { href: "/courses", keywords: ["class", "授業"], kind: "screen", label: "コース" },
  { href: "/calendar", keywords: ["予定", "締切"], kind: "screen", label: "カレンダー" },
  { href: "/notifications", keywords: ["お知らせ", "未読"], kind: "screen", label: "通知" },
  { href: "/messages", keywords: ["会話", "連絡"], kind: "screen", label: "メッセージ" },
  { href: "/grades", keywords: ["評価", "点数"], kind: "screen", label: "成績" },
  { href: "/people", keywords: ["参加者", "連絡先"], kind: "screen", label: "参加者" },
  { href: "/files", keywords: ["教材", "保存"], kind: "screen", label: "プライベートファイル" },
  { href: "/badges", keywords: ["実績"], kind: "screen", label: "バッジ" },
  { href: "/plans", keywords: ["目標", "コンピテンシー"], kind: "screen", label: "学習プラン" },
  { href: "/profile", keywords: ["設定", "アカウント"], kind: "screen", label: "プロフィール" },
  { href: "/shortcuts", keywords: ["keyboard", "操作"], kind: "screen", label: "キーボードショートカット" },
  { href: "/diagnostics", keywords: ["api", "接続", "設定"], kind: "screen", label: "接続診断" },
  { href: "/tools/pdf", keywords: ["結合", "画像", "変換"], kind: "screen", label: "PDFツール" },
] as const satisfies readonly CommandItem[];

type AppShellProps = Readonly<{
  appName: string;
  children: ReactNode;
  courses: readonly CommandCourse[];
  siteName: string;
}>;

function resolveWorkspaceMode(pathname: string): WorkspaceMode {
  if (pathname.startsWith("/messages")) return "conversation";
  if (pathname.startsWith("/activities/") || pathname.startsWith("/assignments/")) return "focus";
  if (pathname.startsWith("/courses")) return "browse";
  return "overview";
}

const accountLinkClass = "flex min-h-11 items-center gap-3 rounded-[var(--shape-control)] px-3 text-sm font-semibold text-[var(--text-secondary)] no-underline transition-colors duration-[120ms] hover:bg-[var(--surface-inset)] hover:text-[var(--text-primary)]";

function AccountMenuContent({ appName, siteName }: Readonly<{ appName: string; siteName: string }>) {
  return (
    <div className="grid gap-3">
      <div className="px-2 pt-1">
        <strong className="block truncate text-sm text-[var(--text-primary)]">{appName}</strong>
        <p className="ui-app-site m-0 mt-0.5 truncate text-xs text-[var(--text-tertiary)]" title={siteName}>{siteName}</p>
      </div>
      <div className="grid grid-cols-2 gap-1" role="group" aria-label="補助機能">
        <TransitionLink className={accountLinkClass} href="/profile" intent="switch"><UserCircle aria-hidden className="shrink-0" size={18} />プロフィール</TransitionLink>
        <TransitionLink className={accountLinkClass} href="/grades" intent="switch"><ChartBar aria-hidden className="shrink-0" size={18} />成績</TransitionLink>
        <TransitionLink className={accountLinkClass} href="/files" intent="switch"><File aria-hidden className="shrink-0" size={18} />ファイル</TransitionLink>
        <TransitionLink className={accountLinkClass} href="/tools/pdf" intent="switch"><FilePdf aria-hidden className="shrink-0" size={18} />PDF</TransitionLink>
        <TransitionLink className={accountLinkClass} href="/shortcuts" intent="switch"><Lightning aria-hidden className="shrink-0" size={18} />操作一覧</TransitionLink>
        <TransitionLink className={accountLinkClass} href="/diagnostics" intent="switch"><Lifebuoy aria-hidden className="shrink-0" size={18} />接続診断</TransitionLink>
        <TransitionLink className={classNames(accountLinkClass, "col-span-2")} href="/people" intent="switch"><IdentificationCard aria-hidden className="shrink-0" size={18} />参加者</TransitionLink>
      </div>
      <div className="border-t border-[var(--border-subtle)] pt-3"><ThemeControl /></div>
      <LogoutButton />
    </div>
  );
}

export function AppShell({
  appName,
  children,
  courses,
  siteName,
}: AppShellProps) {
  const pathname = usePathname();
  const workspaceMode = resolveWorkspaceMode(pathname);
  const commands: readonly CommandItem[] = [
    ...SCREEN_COMMANDS,
    ...courses.map((course) => ({
      href: course.href,
      keywords: [course.shortName],
      kind: "course" as const,
      label: course.name,
    })),
  ];

  return (
    <div className="ui-app-shell grid h-dvh min-h-dvh grid-rows-[var(--app-topbar-height)_minmax(0,1fr)_auto] overflow-hidden bg-[var(--surface-canvas)] md:grid-cols-[var(--app-list-width)_minmax(0,1fr)] md:grid-rows-[var(--app-topbar-height)_minmax(0,1fr)] xl:grid-cols-[var(--app-sidebar-width)_minmax(0,1fr)]" data-workspace-mode={workspaceMode}>
      <a className="ui-app-skip fixed top-2 left-2 z-[120] -translate-y-[calc(100%+1rem)] rounded-[var(--shape-control)] bg-[var(--accent-500)] px-4 py-3 font-semibold text-[var(--accent-contrast)] transition-transform duration-[120ms] focus:translate-y-0" href="#main-content">本文へ移動</a>
      <aside aria-label="主要ナビゲーション" className="ui-app-focus-rail hidden min-h-0 border-r border-[var(--border-subtle)] bg-[var(--surface-primary)] p-2 md:col-start-1 md:row-span-2 md:grid md:grid-rows-[auto_minmax(0,1fr)_auto] xl:p-3">
        <TransitionLink className="ui-app-brand inline-flex min-h-11 min-w-0 items-center justify-center gap-3 rounded-[var(--shape-control)] text-sm font-bold text-[var(--text-primary)] no-underline xl:justify-start xl:px-2" href="/dashboard" intent="switch" title={appName}>
          <span className="ui-app-brand__mark grid size-10 shrink-0 place-items-center rounded-[var(--shape-control)] bg-[var(--accent-500)] text-[var(--accent-contrast)]"><GraduationCap aria-hidden size={22} weight="regular" /></span>
          <span className="hidden min-w-0 truncate xl:block">{appName}</span>
        </TransitionLink>
        <div className="self-center"><AppNavigation /></div>
        <footer className="ui-app-focus-rail__footer grid gap-1">
          <PopoverMenu
            align="start"
            label="表示とアカウント設定"
            side="top"
            trigger={<button aria-label="表示とアカウント設定" className="grid min-h-11 w-full place-items-center rounded-[var(--shape-control)] border-0 bg-transparent text-[var(--text-secondary)] transition-colors duration-[120ms] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)] xl:flex xl:gap-3 xl:px-3" type="button"><GearSix aria-hidden className="shrink-0" size={21} /><span className="hidden text-xs font-semibold xl:block">アカウント</span></button>}
          >
            <AccountMenuContent appName={appName} siteName={siteName} />
          </PopoverMenu>
        </footer>
      </aside>
      <header className="ui-app-topbar flex min-h-[var(--app-topbar-height)] min-w-0 items-center gap-3 border-b border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-primary)_94%,transparent)] px-3 backdrop-blur-xl md:col-start-2 md:row-start-1 md:justify-between md:px-5">
        <TransitionLink className="ui-app-brand ui-app-brand--mobile mr-auto inline-flex min-h-11 min-w-0 items-center gap-2 text-sm font-bold text-[var(--text-primary)] no-underline md:hidden" href="/dashboard" intent="switch" title={appName}>
          <span className="ui-app-brand__mark grid size-9 shrink-0 place-items-center rounded-[var(--shape-control)] bg-[var(--accent-500)] text-[var(--accent-contrast)]"><GraduationCap aria-hidden size={20} weight="regular" /></span>
          <span className="max-w-40 truncate">{appName}</span>
        </TransitionLink>
        <div className="ui-app-topbar__identity hidden min-w-0 md:grid">
          <strong className="truncate text-xs text-[var(--text-primary)]">{appName}</strong>
          <span className="truncate text-xs text-[var(--text-tertiary)]" title={siteName}>{siteName}</span>
        </div>
        <div className="ui-app-context-actions flex min-w-0 items-center gap-2">
          <CommandPalette commands={commands} />
        </div>
        <div className="md:hidden">
          <PopoverMenu
            label="表示とアカウント設定"
            trigger={<button aria-label="表示とアカウント設定" className="grid size-11 shrink-0 place-items-center rounded-[var(--shape-control)] border-0 bg-[var(--surface-elevated)] text-[var(--text-secondary)] shadow-[var(--shadow-control)]" type="button"><GearSix aria-hidden size={21} /></button>}
          >
            <AccountMenuContent appName={appName} siteName={siteName} />
          </PopoverMenu>
        </div>
      </header>
      <main className="ui-app-main min-h-0 min-w-0 overflow-x-clip overflow-y-auto overscroll-contain bg-[var(--surface-canvas)] [scrollbar-gutter:stable] md:col-start-2 md:row-start-2" id="main-content" tabIndex={-1}>
        <div className={classNames(
          "ui-app-content mx-auto min-h-full min-w-0 w-full max-w-none p-0",
          workspaceMode === "conversation" && "h-full",
        )}>
          <div className={classNames("min-w-0", workspaceMode === "conversation" && "h-full min-h-0")}>
            <WorkspaceTransition>{children}</WorkspaceTransition>
          </div>
        </div>
      </main>
      <AppNavigation mobile />
    </div>
  );
}
