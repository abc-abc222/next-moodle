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

import { Badge, Notice } from "@/components/ui";
import { InspectorSheet } from "@/components/app-shell/inspector-sheet";
import { ContextPanel } from "@/components/app-shell/context-panel";
import { SharedTransition, TransitionLink } from "@/components/app-shell/transitions";
import { PageFrame, RouteHeader, SectionIndex } from "@/components/app-shell/workspace-frame";
import type { AppRuntimeConfig } from "@/lib/app-config";
import { dateTimeFormatter } from "@/lib/date-time";
import type {
  CourseActivity,
  CourseDetail as CourseDetailData,
} from "@/lib/moodle/queries/courses";
import type { ActivityDestination } from "@/lib/moodle/queries/courses-model";
import "./courses.css";

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
      return <TransitionLink className="ui-course-activity__action" href={destination.href} intent="drill-in">開く <ArrowRight aria-hidden size={15} /></TransitionLink>;
    case "disabled":
      return <span className="ui-course-activity__locked"><LockSimple aria-hidden size={15} />{destination.reason === "adapter_required" ? "アダプター待ち" : "利用不可"}</span>;
    default:
      return assertNever(destination);
  }
}

function CompletionIcon({ state }: Readonly<{ state: CourseActivity["completion"] }>) {
  return state === "complete"
    ? <CheckCircle aria-label="完了" className="ui-course-activity__complete" size={18} weight="fill" />
    : <Circle aria-label={state === "none" ? "完了条件なし" : "未完了"} size={18} />;
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
    <div className="ui-course-inspector-content">
      <div className="ui-course-progress"><strong className="ui-tabular">{tracked === 0 ? "—" : `${Math.round((completed / tracked) * 100)}%`}</strong><span>{completed} / {tracked} 完了</span></div>
      <dl>
        <div><dt>コース</dt><dd>{data.course.shortName}</dd></div>
        <div><dt>教材</dt><dd>{activities.length}</dd></div>
        <div><dt>利用制限</dt><dd>{restricted}</dd></div>
      </dl>
      <TransitionLink className="ui-app-action-link" href="/grades" intent="switch">成績を確認</TransitionLink>
      <TransitionLink className="ui-app-action-link" href={`/messages/new?courseId=${data.course.id}`} intent="drill-in">担当教員へ連絡</TransitionLink>
    </div>
  );

  return (
    <PageFrame
      content={data.sections.length === 0 ? (
        <Notice title="公開中のセクションはありません" tone="info">
          <p>教材が公開されると、この画面に表示されます。</p>
        </Notice>
      ) : (
        <div className="ui-course-canvas" aria-label="コース教材ストリーム">
          <div className="ui-course-overview-band">
            <span><strong className="ui-tabular">{activities.length}</strong> 教材</span>
            <span><strong className="ui-tabular">{completed}</strong> 完了</span>
            <span><strong className="ui-tabular">{restricted}</strong> 利用制限</span>
          </div>
          <div className="ui-course-sections">
              {data.sections.map((section) => (
                <section id={`section-${section.id}`} key={section.id}>
                  <header><h2>{section.name}</h2><span>{section.items.length}</span></header>
                  {section.summary === "" ? null : <div className="ui-course-section__summary ui-rich-content" dangerouslySetInnerHTML={{ __html: section.summary }} />}
                  {section.items.length === 0 ? (
                    <p className="ui-course-section__empty">公開中の教材はありません。</p>
                  ) : (
                    <div className="ui-course-stream">
                      {section.items.map((item) => item.kind === "label" ? (
                        <article className="ui-course-label" key={item.id}>
                          <span>{item.title}</span>
                          {item.content === "" ? null : <div className="ui-rich-content" dangerouslySetInnerHTML={{ __html: item.content }} />}
                        </article>
                      ) : item.kind === "error" ? (
                        <div className="ui-course-module-error" key={item.id}>
                          <WarningCircle aria-hidden size={18} />
                          <span><strong>{item.name}</strong><small>{item.moduleType} · 応答を読み取れません</small></span>
                        </div>
                      ) : (
                        <article className="ui-course-activity" key={item.id}>
                          <div className="ui-course-activity__row">
                            <CompletionIcon state={item.completion} />
                            <span className="ui-course-activity__icon"><FileText aria-hidden size={19} /></span>
                            <span className="ui-course-activity__title">
                              <SharedTransition identifier={item.id} kind="activity"><strong>{item.name}</strong></SharedTransition>
                              <small>{item.typeLabel}{item.dueAt === undefined ? "" : ` · ${dateFormat.format(new Date(item.dueAt * 1_000))}`}</small>
                            </span>
                            {item.availability !== "available" ? <Badge tone="warning">利用制限</Badge> : null}
                            {item.adapterState === "companion" ? <Badge tone="accent">拡張対応</Badge> : null}
                            {item.delivery === "runtime" ? <Badge tone="info">隔離実行</Badge> : null}
                            {item.adapterState === "adapter_required" ? <Badge tone="info">アダプターが必要</Badge> : null}
                            {item.adapterState === "unavailable" ? <WarningCircle aria-label="API未許可" className="ui-course-activity__warning" size={18} /> : null}
                            <ActivityAction activity={item} />
                          </div>
                          {item.description === "" ? null : <div className="ui-course-activity__description ui-rich-content" dangerouslySetInnerHTML={{ __html: item.description }} />}
                          {item.files.length === 0 ? null : <ul className="ui-course-activity__files">{item.files.map((file) => <li key={`${file.filename}:${file.filesize}`}>{file.downloadUrl === null ? <span>{file.filename}</span> : <a href={file.downloadUrl}><DownloadSimple aria-hidden size={16} />{file.filename}</a>}<small>{file.mimetype}</small></li>)}</ul>}
                        </article>
                      ))}
                    </div>
                  )}
                </section>
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
    />
  );
}
