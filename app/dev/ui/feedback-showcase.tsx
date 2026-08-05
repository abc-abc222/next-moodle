import {
  ArrowClockwise,
  ArrowRight,
  CalendarBlank,
} from "@phosphor-icons/react/dist/ssr";
import { SystemState } from "@/components/app-shell/system-state";
import { Button, Card, EmptyState, Notice, SkeletonGroup, Surface } from "@/components/ui";
import { ShowcaseSection } from "./showcase-frame";

export function FeedbackShowcase() {
  return (
    <ShowcaseSection
      description="Tonal depth distinguishes surfaces; loading, empty, and error compositions keep context and expose one useful next step."
      eyebrow="03 / Feedback"
      title="Surfaces and system states"
    >
      <div className="grid gap-3 md:grid-cols-3">
        <Surface eyebrow="Base" title="Course summary">
          Quiet containment for everyday information with the graphite paired-rim material.
        </Surface>
        <Surface eyebrow="Raised" title="Priority work" variant="raised">
          Elevated luminance and a broad ambient shadow reserve attention for the next action.
        </Surface>
        <Surface eyebrow="Inset" title="Secondary detail" variant="inset">
          Recessed treatment groups metadata without turning every region into another card.
        </Surface>
      </div>

      <div className="grid gap-3">
        <Notice title="Schedule updated">Three upcoming events were refreshed from Moodle.</Notice>
        <Notice title="Submission saved" tone="success">Your online-text draft is stored safely.</Notice>
        <Notice title="Due in 2 days" tone="warning">Review the rubric before submitting your final file.</Notice>
        <Notice
          action={<Button icon={<ArrowClockwise aria-hidden size={16} />} size="compact">Try again</Button>}
          title="Courses could not load"
          tone="error"
          urgent
        >
          Check your connection. Your saved work has not been changed.
        </Notice>
      </div>

      <div className="grid gap-3">
        <SystemState description="このアカウントでは要求された情報を表示できません。" headingLevel={2} kind="forbidden" title="アクセスは禁止されています" />
        <SystemState description="URLが正しくないか、利用できる一覧に対象がありません。" headingLevel={2} kind="not-found" title="ページが見つかりません" />
        <SystemState description="安全な状態を保ったまま処理を停止しました。" headingLevel={2} kind="error" reference="demo-reference" title="問題が発生しました" />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="grid content-start gap-4" padding="spacious"><span className="font-mono text-xs text-[var(--text-tertiary)]">LOADING</span><h3 className="m-0 text-lg font-semibold">Fetching assignments</h3><SkeletonGroup rows={3} /></Card>

        <Card className="grid content-start gap-4" padding="spacious"><span className="font-mono text-xs text-[var(--text-tertiary)]">EMPTY</span><h3 className="m-0 text-lg font-semibold">No upcoming work</h3><EmptyState action={<Button icon={<ArrowRight aria-hidden size={16} />} size="compact" variant="ghost">Browse courses</Button>} icon={<CalendarBlank aria-hidden size={24} weight="regular" />} title="予定はありません"><p>You are clear for the next seven days.</p></EmptyState></Card>

        <Card className="grid content-start gap-4" padding="spacious"><span className="font-mono text-xs text-[var(--text-tertiary)]">HTML DELIVERY</span><h3 className="m-0 text-lg font-semibold">Parsed Moodle screen</h3><p className="m-0 text-sm leading-6 text-[var(--text-secondary)]">標準APIがない活動も、認証済みHTMLを型付き画面モデルへ変換してアプリ内で完結します。</p><Button icon={<ArrowRight aria-hidden size={16} />} size="compact" variant="secondary">変換画面を確認</Button></Card>
      </div>
    </ShowcaseSection>
  );
}
