import {
  Bell,
  BookOpen,
  CalendarDots,
  ChatCircleDots,
  House,
  MagnifyingGlass,
} from "@phosphor-icons/react/dist/ssr";

import { ActionDock, DataRow, RouteHeader } from "@/components/app-shell/workspace-frame";
import { Badge, Button, Card, DataList, DataListItem, Progress, Toolbar } from "@/components/ui";
import { ShowcaseSample, ShowcaseSection } from "./showcase-frame";

const NAV_ITEMS = [
  { icon: House, label: "ホーム", selected: true },
  { icon: BookOpen, label: "コース", selected: false },
  { icon: CalendarDots, label: "予定", selected: false },
  { icon: ChatCircleDots, label: "メッセージ", selected: false },
  { icon: Bell, label: "通知", selected: false },
] as const;

export function EditorialNativeShowcase() {
  return (
    <ShowcaseSection
      description="学習内容を最優先にした面の階層、安定した主要導線、動かないリスト、短い状態遷移を確認します。"
      eyebrow="00 / Quiet learning OS"
      title="Content, context, and calm motion"
    >
      <div className="grid gap-3 lg:grid-cols-2">
        <ShowcaseSample label="Page frame primitives" wide>
          <div className="overflow-hidden rounded-[var(--shape-card)] bg-[var(--surface-secondary)]">
            <div className="p-4 sm:p-6"><RouteHeader description="必要な文脈だけを残した学習キャンバス" eyebrow="COURSE / 04" metadata="12 items" title="研究方法入門" /></div>
            <div className="bg-[var(--surface-primary)] px-3"><DataRow index="01" metadata="教材 · 8分" state="完了" title="観察記録の読み方" /><DataRow index="02" metadata="課題 · 金曜 17:00" state="未完了" title="比較観察レポート" /></div>
            <ActionDock><span className="text-xs text-[var(--text-tertiary)]">すべての変更を保存済み</span><Button>次へ進む</Button></ActionDock>
          </div>
        </ShowcaseSample>

        <ShowcaseSample label="Adaptive primary navigation">
          <nav aria-label="ナビゲーション見本" className="grid gap-1 rounded-[var(--shape-card)] bg-[var(--surface-secondary)] p-3">
            <strong className="px-2 py-3">next-moodle</strong>
            <span className="mb-2 flex min-h-11 items-center gap-2 rounded-[var(--shape-control)] bg-[var(--surface-inset)] px-3 text-sm text-[var(--text-secondary)]"><MagnifyingGlass aria-hidden size={17} />移動・検索</span>
            {NAV_ITEMS.map(({ icon: Icon, label, selected }) => <span className={`flex min-h-11 items-center gap-3 rounded-[var(--shape-control)] px-3 text-sm ${selected ? "bg-[var(--surface-selected)] font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`} data-selected={selected} key={label}><Icon aria-hidden className="shrink-0" size={20} />{label}</span>)}
          </nav>
        </ShowcaseSample>

        <ShowcaseSample label="Course activity list">
          <Card padding="standard"><DataList label="活動"><DataListItem action={<Button size="compact" variant="ghost">開く</Button>} description="小テスト · 明日 17:00" icon={<BookOpen aria-hidden size={18} />} state={<Badge tone="warning">未完了</Badge>} title="理解度チェック" /><DataListItem description="教材 · 8分" icon={<BookOpen aria-hidden size={18} />} state={<Badge tone="success">完了</Badge>} title="観察記録の読み方" /></DataList></Card>
        </ShowcaseSample>

        <ShowcaseSample label="Search and filters">
          <Toolbar label="コース検索"><span className="flex min-h-11 flex-1 items-center gap-2 rounded-[var(--shape-control)] bg-[var(--surface-inset)] px-3 text-sm text-[var(--text-secondary)]"><MagnifyingGlass aria-hidden size={17} />コース・活動を検索</span><Badge tone="accent">進行中</Badge></Toolbar>
        </ShowcaseSample>

        <ShowcaseSample label="Progress and next action">
          <Card className="grid gap-4" padding="spacious" tone="selected"><span className="font-mono text-xs text-[var(--text-tertiary)]">NEXT ACTION</span><div><h3 className="m-0 text-lg font-semibold">比較観察レポート</h3><p className="m-0 mt-1 text-sm text-[var(--text-secondary)]">締切 金曜 17:00</p></div><Progress label="コース進捗" showValue value={64} /><Button>課題を続ける</Button></Card>
        </ShowcaseSample>
      </div>

      <div className="grid gap-2 rounded-[var(--shape-card)] bg-[var(--surface-inset)] p-3 sm:grid-cols-4" aria-label="モーション意図">
        {[
          ["操作", "120ms · 色と押下"],
          ["オーバーレイ", "180ms · 4–16px"],
          ["ルート", "200ms · View Transition"],
          ["共有要素", "220ms · タイトルのみ"],
        ].map(([title, detail]) => <span className="grid gap-1 rounded-[var(--shape-control)] bg-[var(--surface-primary)] p-3" key={title}><strong className="text-sm">{title}</strong><small className="text-xs text-[var(--text-tertiary)]">{detail}</small></span>)}
      </div>
    </ShowcaseSection>
  );
}
