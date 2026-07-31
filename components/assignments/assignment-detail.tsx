import { ArrowLeft, CalendarDots, FileText, Info } from "@phosphor-icons/react/dist/ssr";

import { InspectorSheet } from "@/components/app-shell/inspector-sheet";
import { TransitionLink } from "@/components/app-shell/transitions";
import { PageFrame, RouteHeader } from "@/components/app-shell/workspace-frame";
import { Badge, Notice, RichContent } from "@/components/ui";
import type { AiAvailability } from "@/lib/ai/config";
import type { AppRuntimeConfig } from "@/lib/app-config";
import { dateTimeFormatter } from "@/lib/date-time";
import type { MoodleScreenModel } from "@/lib/moodle/page-model";
import type { AssignmentDetail } from "@/lib/moodle/queries/assignments";
import { AssignmentSubmissionForm } from "./assignment-submission-form";
import { AssignmentHtmlWorkspace } from "./assignment-html-workspace";
import { assignmentStatusLabel } from "./status-label";

function dueLabel(data: AssignmentDetail, config: AppRuntimeConfig): string {
  if (data.dueAt === 0) return "期限なし";
  return dateTimeFormatter(config.locale, { dateStyle: "medium", timeStyle: "short", timeZone: config.timeZone }).format(new Date(data.dueAt * 1_000));
}

function fallbackReason(data: AssignmentDetail): string {
  if (data.nativeSubmission.kind === "enabled") return "";
  switch (data.nativeSubmission.reason) {
    case "locked": return "この提出はロックされています。";
    case "graded": return "採点済みのため提出内容は編集できません。";
    case "final_state": return "提出済みのため提出内容は編集できません。";
    case "not_open": return "この課題はまだ提出期間外です。";
    case "cutoff_reached": return "提出締切を過ぎています。";
    case "permission": return "この課題への提出権限がありません。";
    case "capability": return "Moodle管理者のAPI設定ではこの提出方法を利用できません。";
    case "unsupported_plugin": return "この提出形式は現在のアプリでは対応していません。";
  }
}

export function AssignmentDetailView({ aiAvailability, aiConsentStorageKey, config, data, draftStorageKey }: Readonly<{
  aiAvailability: AiAvailability;
  aiConsentStorageKey: string;
  config: AppRuntimeConfig;
  data: AssignmentDetail;
  draftStorageKey: string;
}>) {
  const native = data.nativeSubmission;
  const due = dueLabel(data, config);
  const updated = data.updatedAt === 0 ? "未保存" : dateTimeFormatter(config.locale, { dateStyle: "medium", timeStyle: "short", timeZone: config.timeZone }).format(new Date(data.updatedAt * 1_000));
  const details = (
    <div className="ui-assignment-inspector">
      <Badge tone={data.isOverdue ? "error" : "accent"}>{assignmentStatusLabel(data.status)}</Badge>
      <dl className="ui-assignment__facts">
        <div><dt>期限</dt><dd className="ui-tabular">{due}</dd></div>
        <div><dt>最終更新</dt><dd>{updated}</dd></div>
        <div><dt>状態</dt><dd>{data.isLocked ? "ロック中" : data.isGraded ? "採点済み" : data.isOverdue ? "期限超過" : "提出可能"}</dd></div>
      </dl>
      {data.existingFiles.length === 0 ? null : <section><h3>提出済みファイル</h3><ul className="ui-assignment__files">{data.existingFiles.map((file) => <li key={`${file.filename}-${file.filesize}`}><FileText aria-hidden size={18} />{file.downloadUrl === undefined ? file.filename : <a href={file.downloadUrl}>{file.filename}</a>}</li>)}</ul></section>}
    </div>
  );

  return (
    <PageFrame
      content={(
        <article className="ui-assignment-canvas">
          <section className="ui-assignment__description" aria-labelledby="assignment-description-title">
            <header><span>BRIEF</span><h2 id="assignment-description-title">課題の説明</h2></header>
            <RichContent className="ui-rich-content" document={data.description} />
          </section>
          {native.kind === "enabled" ? (
            <AssignmentSubmissionForm aiAvailability={aiAvailability} aiConsentStorageKey={aiConsentStorageKey} cmid={data.cmid} draftStorageKey={draftStorageKey} dueLabel={due} existingFiles={data.existingFiles} initialText={data.existingText} locale={config.locale} policy={native} />
          ) : <Notice title="この提出方法は現在利用できません" tone="warning"><p>{fallbackReason(data)} この提出形式の型付きパーサーが必要です。</p></Notice>}
          {data.feedback === null ? null : <section className="ui-assignment-feedback"><header><span>REVIEW</span><h2>フィードバック</h2></header>{data.feedback.grade === null ? null : <RichContent document={data.feedback.grade} />}{data.feedback.comments.map((comment, index) => <RichContent document={comment} key={index} />)}</section>}
        </article>
      )}
      header={<RouteHeader actions={<InspectorSheet description="提出状況と保存済みファイル" label={<><Info aria-hidden size={17} />提出情報</>} title="提出情報">{details}</InspectorSheet>} description={<><CalendarDots aria-hidden size={16} /> <span className="ui-tabular">{due}</span></>} eyebrow={<TransitionLink href={`/courses/${data.assignment.course}`} intent="return"><ArrowLeft aria-hidden size={15} />{data.courseName}</TransitionLink>} metadata={`CMID ${data.cmid}`} shared={{ identifier: data.cmid, kind: "activity" }} title={data.name} />}
      mode="focus"
    />
  );
}

/** The API path is optional; this view keeps an assignment usable via its Moodle HTML form. */
export function AssignmentHtmlFallbackView({ cmid, screen }: Readonly<{ cmid: number; screen: MoodleScreenModel }>) {
  return <PageFrame
    content={<AssignmentHtmlWorkspace actionEndpoint={`/api/assignments/${cmid}/html-action`} screen={screen} />}
    header={<RouteHeader description="提出状況・期限・操作を学習向けの画面に整理しました。" eyebrow={<TransitionLink href="/courses" intent="return"><ArrowLeft aria-hidden size={15} />コース一覧</TransitionLink>} metadata={`CMID ${cmid}`} shared={{ identifier: cmid, kind: "activity" }} title={screen.title} />}
    mode="focus"
  />;
}
