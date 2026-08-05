import { Command, Keyboard } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";

import { PageFrame, RouteHeader } from "@/components/app-shell/workspace-frame";
import { Card } from "@/components/ui";

export const metadata: Metadata = { title: "キーボードショートカット" };

const SHORTCUTS = [
  { keys: ["⌘ / Ctrl", "K"], label: "画面・コース・活動・会話を検索" },
  { keys: ["↑", "↓"], label: "検索候補を移動" },
  { keys: ["Enter"], label: "選択した項目を開く" },
  { keys: ["Esc"], label: "検索またはAI候補を閉じる" },
  { keys: ["Tab"], label: "AI入力候補を明示的に採用" },
] as const;

export default function ShortcutsPage() {
  return (
    <PageFrame content={<Card className="ui-shortcuts overflow-hidden" aria-labelledby="shortcut-list-title" padding="none">
        <header className="flex min-h-18 items-center gap-3 p-4 sm:p-5"><Keyboard aria-hidden className="shrink-0 text-[var(--accent-400)]" size={20} /><div><h2 className="m-0 text-lg font-semibold" id="shortcut-list-title">共通操作</h2><p className="m-0 mt-1 text-xs text-[var(--text-tertiary)]">macOSでは⌘、Windows / LinuxではCtrlを使います。</p></div></header>
        <dl className="m-0 divide-y divide-[var(--border-subtle)]">{SHORTCUTS.map((shortcut) => <div className="grid min-h-14 items-center gap-2 px-4 py-3 sm:grid-cols-[minmax(10rem,.7fr)_minmax(0,1.3fr)] sm:gap-4" key={shortcut.label}><dt className="flex flex-wrap gap-1">{shortcut.keys.map((key) => <kbd className="rounded-[var(--shape-control)] bg-[var(--surface-inset)] px-2 py-1 font-mono text-xs" key={key}>{key}</kbd>)}</dt><dd className="m-0 text-sm text-[var(--text-secondary)]">{shortcut.label}</dd></div>)}</dl>
        <p className="m-0 flex items-center gap-2 bg-[var(--surface-inset)] p-4 text-xs leading-5 text-[var(--text-secondary)]"><Command aria-hidden className="shrink-0" size={17} />入力欄ではブラウザとOS標準の編集ショートカットもそのまま使えます。</p>
      </Card>} header={<RouteHeader description="マウスへ移動せず、学習画面を操作できます。" eyebrow="操作ガイド" title="キーボードショートカット" />} mode="focus" width="reading" />
  );
}
