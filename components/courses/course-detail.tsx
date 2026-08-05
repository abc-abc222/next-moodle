import {
  ArrowRight,
  CheckCircle,
  Circle,
  FileText,
  DownloadSimple,
  Info,
  LockSimple,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";

import { Badge, Card, EmptyState, Progress, RichContent } from "@/components/ui";
import { InspectorSheet } from "@/components/app-shell/inspector-sheet";
import { ContextPanel } from "@/components/app-shell/context-panel";
import { SharedTransition, TransitionLink } from "@/components/app-shell/transitions";
import { PageFrame, RouteHeader, SectionIndex } from "@/components/app-shell/workspace-frame";
import type { AppRuntimeConfig } from "@/lib/app-config";
import { dateTimeFormatter } from "@/lib/date-time";
import { isEmptyMoodleDocument } from "@/lib/moodle/html";
import type {
  CourseActivity,
  CourseSubsection,
  CourseDetail as CourseDetailData,
} from "@/lib/moodle/queries/courses";
import type { ActivityDestination } from "@/lib/moodle/queries/courses-model";

class UnexpectedActivityDestinationError extends Error {
  override readonly name = "UnexpectedActivityDestinationError";
}

function assertNever(value: never): never {
  throw new UnexpectedActivityDestinationError(`Unexpected activity destination: ${String(value)}`);
}

function ActivityAction({ activity }: Readonly<{ activity: CourseActivity }>): ReactNode {
  const destination: ActivityDestination = activity.destination;
  switch (destination.kind) {
    case "internal":
      return <TransitionLink className="ui-course-activity__action inline-flex min-h-11 shrink-0 items-center gap-1 rounded-[var(--shape-control)] px-3 text-xs font-semibold text-[var(--text-primary)] no-underline transition-colors duration-[120ms] hover:bg-[var(--surface-inset)]" href={destination.href} intent="drill-in">開く <ArrowRight aria-hidden size={15} /></TransitionLink>;
    case "disabled":
      return <span className="ui-course-activity__locked inline-flex min-h-11 items-center gap-1 text-xs text-[var(--text-tertiary)]"><LockSimple aria-hidden size={15} />利用不可</span>;
    default:
      return assertNever(destination);
  }
}

function CompletionIcon({ state }: Readonly<{ state: CourseActivity["completion"] }>) {
  return state === "complete"
    ? <CheckCircle aria-label="完了" className="ui-course-activity__complete shrink-0 text-[var(--status-success)]" size={18} weight="fill" />
    : <Circle aria-label={state === "none" ? "完了条件なし" : "未完了"} className="shrink-0 text-[var(--text-tertiary)]" size={18} />;
}

function SubsectionMarker({ item }: Readonly<{ item: CourseSubsection }>) {
  return <div className="ui-course-subsection grid min-h-14 gap-0.5 border-l-2 border-[var(--accent-500)] bg-[var(--surface-inset)] px-4 py-3" data-indent={Math.min(item.indent, 4)}><span className="text-xs font-semibold text-[var(--accent-400)]">サブセクション</span><strong>{item.title}</strong></div>;
}

export function CourseDetail({ config, data }: Readonly<{
  config: AppRuntimeConfig;
  data: CourseDetailData;
}>) {
  const dateFormat = dateTimeFormatter(config.locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: config.timeZone,
  });
  const activities = data.sections.flatMap((section) =>
    section.items.filter((item): item is CourseActivity => item.kind === "activity"),
  );
  const completed = activities.filter((activity) => activity.completion === "complete").length;
  const tracked = activities.filter((activity) => activity.completion !== "none").length;
  const restricted = activities.filter((activity) => activity.availability !== "available").length;

  const inspector = (
    <div className="ui-course-inspector-content grid gap-5">
      <div className="grid gap-3 rounded-[var(--shape-card)] bg-[var(--surface-inset)] p-4">
        <div className="flex items-end justify-between gap-3"><strong className="ui-tabular text-2xl">{tracked === 0 ? "—" : `${Math.round((completed / tracked) * 100)}%`}</strong><span className="text-xs text-[var(--text-secondary)]">{completed} / {tracked} 完了</span></div>
        <Progress label="コース進捗" value={tracked === 0 ? 0 : (completed / tracked) * 100} />
      </div>
      <dl className="m-0 grid divide-y divide-[var(--border-subtle)]">
        <div className="flex justify-between gap-4 py-3"><dt className="text-sm text-[var(--text-secondary)]">コース</dt><dd className="m-0 text-sm">{data.course.shortName}</dd></div>
        <div className="flex justify-between gap-4 py-3"><dt className="text-sm text-[var(--text-secondary)]">教材</dt><dd className="m-0 text-sm">{activities.length}</dd></div>
        <div className="flex justify-between gap-4 py-3"><dt className="text-sm text-[var(--text-secondary)]">利用制限</dt><dd className="m-0 text-sm">{restricted}</dd></div>
      </dl>
      <TransitionLink className="ui-app-action-link" href="/grades" intent="switch">成績を確認</TransitionLink>
      <TransitionLink className="ui-app-action-link" href={`/messages/new?courseId=${data.course.id}`} intent="drill-in">担当教員へ連絡</TransitionLink>
    </div>
  );

  return (
    <PageFrame
      content={data.sections.length === 0 ? (
        <EmptyState title="公開中のセクションはありません">教材が公開されると、この画面に表示されます。</EmptyState>
      ) : (
        <div className="ui-course-canvas grid min-w-0 gap-6" aria-label="コース教材ストリーム">
          <div className="ui-course-overview-band grid grid-cols-3 divide-x divide-[var(--border-subtle)] rounded-[var(--shape-card)] bg-[var(--surface-inset)] p-2 text-center">
            <span className="grid gap-0.5 px-2 text-xs text-[var(--text-secondary)]"><strong className="ui-tabular text-lg text-[var(--text-primary)]">{activities.length}</strong> 教材</span>
            <span className="grid gap-0.5 px-2 text-xs text-[var(--text-secondary)]"><strong className="ui-tabular text-lg text-[var(--text-primary)]">{completed}</strong> 完了</span>
            <span className="grid gap-0.5 px-2 text-xs text-[var(--text-secondary)]"><strong className="ui-tabular text-lg text-[var(--text-primary)]">{restricted}</strong> 利用制限</span>
          </div>
          <div className="ui-course-sections grid gap-6">
              {data.sections.map((section) => (
                <Card id={`section-${section.id}`} key={section.id} padding="standard" tone="default">
                  <header className="flex min-h-11 items-center justify-between gap-3"><h2 className="m-0 text-lg font-semibold">{section.name}</h2><Badge>{section.items.length}</Badge></header>
                  {isEmptyMoodleDocument(section.summary) ? null : <RichContent className="ui-course-section__summary ui-rich-content mt-3 rounded-[var(--shape-control)] bg-[var(--surface-inset)] p-4" document={section.summary} />}
                  {section.items.length === 0 ? (
                    <p className="ui-course-section__empty m-0 py-5 text-sm text-[var(--text-secondary)]">公開中の教材はありません。</p>
                  ) : (
                    <div className="ui-course-stream mt-3 grid divide-y divide-[var(--border-subtle)]">
                      {section.items.map((item) => item.kind === "label" ? (
                        <article className="ui-course-label py-4" key={item.id}>
                          <span className="text-xs font-semibold text-[var(--accent-400)]">{item.title}</span>
                          {isEmptyMoodleDocument(item.content) ? null : <RichContent className="ui-rich-content" document={item.content} />}
                        </article>
                      ) : item.kind === "subsection" ? (
                        <SubsectionMarker item={item} key={item.id} />
                      ) : item.kind === "error" ? (
                        <div className="ui-course-module-error grid grid-cols-[auto_minmax(0,1fr)] gap-3 py-4 text-[var(--status-warning)]" key={item.id}>
                          <WarningCircle aria-hidden className="shrink-0" size={18} />
                          <span className="grid"><strong>{item.name}</strong><small className="text-xs text-[var(--text-secondary)]">{item.moduleType} · 応答を読み取れません</small></span>
                        </div>
                      ) : (
                        <article className="ui-course-activity py-3" data-indent={Math.min(item.indent, 4)} key={item.id}>
                          <div className="ui-course-activity__row grid min-h-14 grid-cols-[auto_auto_minmax(0,1fr)_auto_auto_auto] items-center gap-3 rounded-[var(--shape-control)] px-2 transition-colors duration-[120ms] hover:bg-[var(--surface-elevated)] max-lg:grid-cols-[auto_auto_minmax(0,1fr)_auto]">
                            <CompletionIcon state={item.completion} />
                            <span className="ui-course-activity__icon grid size-10 shrink-0 place-items-center rounded-[var(--shape-control)] bg-[var(--surface-inset)] text-[var(--text-secondary)]"><FileText aria-hidden size={19} /></span>
                            <span className="ui-course-activity__title grid min-w-0 gap-0.5">
                              <SharedTransition identifier={item.id} kind="activity"><strong className="block truncate">{item.name}</strong></SharedTransition>
                              <small className="truncate text-xs text-[var(--text-tertiary)]">{item.typeLabel}{item.dueAt === undefined ? "" : ` · ${dateFormat.format(new Date(item.dueAt * 1_000))}`}</small>
                            </span>
                            {item.availability !== "available" ? <Badge tone="warning">利用制限</Badge> : null}
                            {item.supportState === "html" ? <Badge tone="info">アプリ内HTML</Badge> : null}
                            <ActivityAction activity={item} />
                          </div>
                          {isEmptyMoodleDocument(item.description) ? null : <RichContent className="ui-course-activity__description ui-rich-content mx-2 mt-2 rounded-[var(--shape-control)] bg-[var(--surface-inset)] p-4" document={item.description} />}
                          {item.files.length === 0 ? null : <ul className="ui-course-activity__files m-0 mt-2 grid list-none gap-1 px-2">{item.files.map((file) => <li className="flex min-h-11 items-center justify-between gap-3 rounded-[var(--shape-control)] px-3 text-sm hover:bg-[var(--surface-inset)]" key={`${file.filename}:${file.filesize}`}>{file.downloadUrl === null ? <span>{file.filename}</span> : <a className="inline-flex min-w-0 items-center gap-2 text-[var(--text-primary)] no-underline" href={file.downloadUrl}><DownloadSimple aria-hidden className="shrink-0" size={16} /><span className="truncate">{file.filename}</span></a>}<small className="shrink-0 text-xs text-[var(--text-tertiary)]">{file.mimetype}</small></li>)}</ul>}
                        </article>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
        </div>
        </div>
      )}
      context={data.sections.length === 0 ? undefined : (
        <ContextPanel count={data.sections.length} storageKey="course" title="セクション">
          <nav aria-label="コースセクション">
            <SectionIndex items={data.sections.map((section) => ({ href: `#section-${section.id}`, id: section.id, label: section.name }))} />
          </nav>
        </ContextPanel>
      )}
      header={(
        <RouteHeader
          actions={<InspectorSheet description="進捗、成績、担当教員への連絡" label={<><Info aria-hidden size={17} />コース情報</>} title="コース情報">{inspector}</InspectorSheet>}
          eyebrow={<><TransitionLink href="/courses" intent="return">コース</TransitionLink><span> / {data.course.shortName}</span></>}
          metadata={`${activities.length} activities`}
          shared={{ identifier: data.course.id, kind: "course" }}
          title={data.course.name}
        />
      )}
      mode="browse"
      width="wide"
    />
  );
}
