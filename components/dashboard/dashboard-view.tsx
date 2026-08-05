import {
  ArrowRight,
  Bell,
  CalendarDots,
  ClockCountdown,
  FilePdf,
  Sparkle,
} from "@phosphor-icons/react/dist/ssr";

import { SharedTransition, TransitionLink } from "@/components/app-shell/transitions";
import { PageFrame, RouteHeader } from "@/components/app-shell/workspace-frame";
import { Badge, Card, DataList, DataListItem, EmptyState, StatusPanel } from "@/components/ui";
import type { AppRuntimeConfig } from "@/lib/app-config";
import { calendarDate, dateTimeFormatter } from "@/lib/date-time";
import type {
  DashboardEvent,
  DashboardProjection,
} from "@/lib/moodle/queries/dashboard-model";

function EventBadge({ event }: Readonly<{ event: DashboardEvent }>) {
  return event.status === "overdue" ? (
    <Badge tone="error">期限超過</Badge>
  ) : (
    <Badge tone="warning">次の期限</Badge>
  );
}

export function DashboardView({ config, data }: Readonly<{
  config: AppRuntimeConfig;
  data: DashboardProjection;
}>) {
  const dateTimeFormat = dateTimeFormatter(config.locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: config.timeZone,
  });
  const dayFormat = dateTimeFormatter(config.locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    weekday: "short",
  });
  const formatTimestamp = (value: number) => dateTimeFormat.format(new Date(value * 1_000));
  const formatDateKey = (value: string) => dayFormat.format(calendarDate(value));
  const scheduledDays = data.horizon.filter((day) => day.events.length > 0);

  return (
    <PageFrame
      content={<div className="ui-dashboard-board grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
        <Card className="ui-dashboard-panel ui-dashboard-panel--deadline lg:col-span-5 xl:col-span-4" padding="spacious" tone="elevated">
          <header className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)]">
            <ClockCountdown aria-hidden size={19} />
            <h2 className="m-0 text-sm font-semibold" id="deadline-title">次にやること</h2>
          </header>
          {data.nextUp === null ? (
            <StatusPanel className="mt-5" title="急ぎの学習はありません" tone="success">
              次の予定が追加されるまで、進行中のコースを確認できます。
            </StatusPanel>
          ) : (
            <div className="ui-dashboard-deadline mt-6 grid content-start gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]"><EventBadge event={data.nextUp} /><span>{data.nextUp.courseName}</span></div>
              <h3 className="m-0 text-[clamp(1.5rem,3vw,2rem)] leading-tight font-bold tracking-[-.035em] text-balance">{data.nextUp.name}</h3>
              <time className="tabular-nums text-sm text-[var(--text-secondary)]" dateTime={new Date(data.nextUp.startsAt * 1_000).toISOString()}>
                {formatTimestamp(data.nextUp.startsAt)}
              </time>
              <TransitionLink className="ui-app-action-link mt-2 justify-self-start" href="/calendar" intent="switch">予定を確認 <ArrowRight aria-hidden size={15} /></TransitionLink>
            </div>
          )}
        </Card>

        <Card className="ui-dashboard-panel ui-dashboard-panel--timeline lg:col-span-7 xl:col-span-8" padding="standard" tone="default">
          <header className="flex min-h-11 items-center justify-between gap-3">
            <div className="flex items-center gap-2"><CalendarDots aria-hidden size={19} /><h2 className="m-0 text-base font-semibold" id="timeline-title">直近7日の予定</h2></div>
            <TransitionLink className="text-xs font-semibold text-[var(--text-secondary)] no-underline hover:text-[var(--text-primary)]" href="/calendar" intent="switch">すべて表示 <ArrowRight aria-hidden className="inline" size={15} /></TransitionLink>
          </header>
          {scheduledDays.length === 0 ? (
            <EmptyState className="mt-3" icon={<CalendarDots aria-hidden size={20} />} title="直近の予定はありません">新しい予定が追加されると、ここに表示されます。</EmptyState>
          ) : (
            <DataList className="mt-2" label="直近7日の予定">
              {scheduledDays.flatMap((day) => day.events.map((event) => (
                <DataListItem
                  description={event.name}
                  key={`${day.dateKey}-${event.id}`}
                  metadata={formatTimestamp(event.startsAt)}
                  title={<time dateTime={day.dateKey}>{formatDateKey(day.dateKey)}</time>}
                />
              )))}
            </DataList>
          )}
        </Card>

        <Card className="ui-dashboard-panel ui-dashboard-panel--courses lg:col-span-8" padding="standard" tone="default">
          <header className="flex min-h-11 items-center justify-between gap-3">
            <div className="flex items-center gap-2"><h2 className="m-0 text-base font-semibold" id="courses-title">進行中のコース</h2><Badge>{data.recentCourses.length}</Badge></div>
            <TransitionLink className="text-xs font-semibold text-[var(--text-secondary)] no-underline hover:text-[var(--text-primary)]" href="/courses" intent="switch">コース一覧 <ArrowRight aria-hidden className="inline" size={15} /></TransitionLink>
          </header>
          {data.recentCourses.length === 0 ? (
            <EmptyState className="mt-3" title="表示できるコースはありません" />
          ) : (
            <ul className="ui-dashboard-course-list m-0 mt-2 list-none divide-y divide-[var(--border-subtle)] p-0">
              {data.recentCourses.map((course, index) => (
                <li className="grid min-h-16 grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--shape-control)] px-2 transition-colors duration-[120ms] hover:bg-[var(--surface-elevated)]" key={course.id}>
                  <span className="ui-dashboard-course-index ui-tabular font-mono text-xs text-[var(--text-tertiary)]">{String(index + 1).padStart(2, "0")}</span>
                  <TransitionLink className="grid min-w-0 text-[var(--text-primary)] no-underline" href={`/courses/${course.id}`} intent="drill-in"><SharedTransition identifier={course.id} kind="course"><strong className="truncate">{course.name}</strong></SharedTransition><small className="truncate text-xs text-[var(--text-tertiary)]">{course.shortName}</small></TransitionLink>
                  <ArrowRight aria-hidden className="shrink-0 text-[var(--text-tertiary)]" size={16} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="ui-dashboard-panel ui-dashboard-panel--signals lg:col-span-4" padding="standard" tone="inset">
          <header className="flex min-h-11 items-center gap-2"><Sparkle aria-hidden size={18} /><h2 className="m-0 text-base font-semibold" id="signals-title">クイックアクセス</h2></header>
          <div className="ui-dashboard-signal-list mt-2 grid divide-y divide-[var(--border-subtle)]">
            <TransitionLink className="grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--shape-control)] px-2 text-[var(--text-primary)] no-underline transition-colors duration-[120ms] hover:bg-[var(--surface-elevated)]" href="/notifications" intent="switch"><Bell aria-hidden className="shrink-0" size={19} /><span className="grid"><strong className="ui-tabular text-lg">{data.unreadCount}</strong><small className="text-xs text-[var(--text-tertiary)]">未読通知</small></span><ArrowRight aria-hidden size={16} /></TransitionLink>
            <TransitionLink className="grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--shape-control)] px-2 text-[var(--text-primary)] no-underline transition-colors duration-[120ms] hover:bg-[var(--surface-elevated)]" href="/tools/pdf" intent="switch"><FilePdf aria-hidden className="shrink-0" size={19} /><span className="grid"><strong>PDFツール</strong><small className="text-xs text-[var(--text-tertiary)]">端末内で整理</small></span><ArrowRight aria-hidden size={16} /></TransitionLink>
          </div>
        </Card>
      </div>}
      header={<RouteHeader description="締切、授業、未読から、いま必要な行動を整理します。" eyebrow={`TODAY / ${config.timeZone}`} title="学習ワークスペース" />}
      mode="overview"
      width="full"
    />
  );
}
