"use client";

import {
  FilePdf,
  GearSix,
  GraduationCap,
} from "@phosphor-icons/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { CommandPalette } from "@/components/command-palette/command-palette";
import type { CommandItem } from "@/components/command-palette/search";
import { ThemeControl } from "@/components/ui";
import type { CommandCourse } from "@/lib/moodle/queries/courses";
import { LogoutButton } from "./logout-button";
import { AppNavigation } from "./navigation";
import { TransitionLink, WorkspaceTransition } from "./transitions";
import type { WorkspaceMode } from "./motion";
import "./app-shell.css";
import "./page-layout.css";

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
  { href: "/profile", keywords: ["設定", "アカウント"], kind: "screen", label: "その他・プロフィール" },
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
    <div className="ui-app-shell" data-workspace-mode={workspaceMode}>
      <a className="ui-app-skip" href="#main-content">本文へ移動</a>
      <aside aria-label="主要ナビゲーション" className="ui-app-focus-rail">
        <TransitionLink className="ui-app-brand" href="/dashboard" intent="switch" title={appName}>
          <span className="ui-app-brand__mark"><GraduationCap aria-hidden size={22} weight="regular" /></span>
          <span>{appName}</span>
        </TransitionLink>
        <AppNavigation />
        <footer className="ui-app-focus-rail__footer">
          <TransitionLink className="ui-app-tool-link" href="/tools/pdf" intent="switch" title="PDFツール">
            <FilePdf aria-hidden size={21} weight="regular" />
            <span>PDF</span>
          </TransitionLink>
          <details className="ui-app-dock-settings">
            <summary aria-label="表示とアカウント設定">
              <GearSix aria-hidden size={21} weight="regular" />
            </summary>
            <div className="ui-app-dock-settings__panel">
              <div><strong>{appName}</strong><p className="ui-app-site" title={siteName}>{siteName}</p></div>
              <ThemeControl />
              <LogoutButton />
            </div>
          </details>
        </footer>
      </aside>
      <header className="ui-app-topbar">
        <TransitionLink className="ui-app-brand ui-app-brand--mobile" href="/dashboard" intent="switch" title={appName}>
          <span className="ui-app-brand__mark"><GraduationCap aria-hidden size={20} weight="regular" /></span>
          <span>{appName}</span>
        </TransitionLink>
        <div className="ui-app-topbar__identity">
          <strong>{appName}</strong>
          <span title={siteName}>{siteName}</span>
        </div>
        <div className="ui-app-context-actions">
          <CommandPalette commands={commands} />
        </div>
        <details className="ui-app-mobile-settings">
          <summary aria-label="表示とアカウント設定">
            <GearSix aria-hidden size={21} weight="regular" />
          </summary>
          <div className="ui-app-mobile-settings__panel">
            <p className="ui-app-site" title={siteName}>{siteName}</p>
            <TransitionLink className="ui-app-tool-link" href="/tools/pdf" intent="switch"><FilePdf aria-hidden size={20} /> PDFツール</TransitionLink>
            <ThemeControl />
            <LogoutButton />
          </div>
        </details>
      </header>
      <main className="ui-app-main" id="main-content" tabIndex={-1}>
        <div className="ui-app-content"><WorkspaceTransition>{children}</WorkspaceTransition></div>
      </main>
      <AppNavigation mobile />
    </div>
  );
}
