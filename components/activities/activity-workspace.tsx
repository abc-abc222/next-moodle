import {
  ArrowLeft,
  CheckCircle,
  DownloadSimple,
  File,
  Info,
  LockSimple,
  PuzzlePiece,
} from "@phosphor-icons/react/dist/ssr";

import { InspectorSheet } from "@/components/app-shell/inspector-sheet";
import { TransitionLink } from "@/components/app-shell/transitions";
import { PageFrame, RouteHeader } from "@/components/app-shell/workspace-frame";
import { Notice, RichContent } from "@/components/ui";
import type { AppRuntimeConfig } from "@/lib/app-config";
import { dateTimeFormatter } from "@/lib/date-time";
import { isEmptyMoodleDocument } from "@/lib/moodle/html";
import type { NativeActivityData } from "@/lib/moodle/activities/native";
import { publicHtmlActivityScreen } from "@/lib/moodle/activities/html-screen";
import type { ActivityWorkspaceDetail } from "@/lib/moodle/queries/activity";
import { ChoiceWorkspace } from "./choice-workspace";
import { CompletionToggle } from "./completion-toggle";
import { DatabaseWorkspace } from "./database-workspace";
import { FeedbackWorkspace } from "./feedback-workspace";
import { ForumWorkspace } from "./forum-workspace";
import { ForumHtmlWorkspace } from "./forum-html-workspace";
import { GlossaryWorkspace } from "./glossary-workspace";
import { LessonWorkspace } from "./lesson-workspace";
import { QuizWorkspace } from "./quiz-workspace";
import { WikiWorkspace } from "./wiki-workspace";
import { WorkshopWorkspace } from "./workshop-workspace";
import { HtmlActivityWorkspace } from "./html-activity-workspace";
import "./activities.css";

function formatBytes(value: number): string {
  if (value < 1_024) return `${value} B`;
  if (value < 1_024 * 1_024) return `${Math.round(value / 1_024)} KB`;
  return `${(value / (1_024 * 1_024)).toFixed(1)} MB`;
}

function localizedDateLabel(label: string): string {
  const normalized = label.trim().toLowerCase();
  if (normalized === "closes" || normalized.includes("close")) return "終了";
  if (normalized === "opens" || normalized.includes("open")) return "開始";
  if (normalized.includes("due")) return "期限";
  return label;
}

function NativePanel({ cmid, config, native }: Readonly<{ cmid: number; config: AppRuntimeConfig; native: NativeActivityData }>) {
  if (native.kind === "quiz") return <QuizWorkspace cmid={cmid} data={native.data} />;
  if (native.kind === "database") return <DatabaseWorkspace cmid={cmid} data={native.data} />;
  if (native.kind === "forum") return <ForumWorkspace cmid={cmid} data={native.data} locale={config.locale} timeZone={config.timeZone} />;
  if (native.kind === "choice") return <ChoiceWorkspace cmid={cmid} data={native.data} />;
  if (native.kind === "feedback") return <FeedbackWorkspace cmid={cmid} data={native.data} />;
  if (native.kind === "glossary") return <GlossaryWorkspace cmid={cmid} data={native.data} />;
  if (native.kind === "lesson") return <LessonWorkspace cmid={cmid} data={native.data} />;
  if (native.kind === "workshop") return <WorkshopWorkspace cmid={cmid} data={native.data} locale={config.locale} timeZone={config.timeZone} />;
  return <WikiWorkspace cmid={cmid} data={native.data} />;
}

export function ActivityWorkspace({ canUpdateCompletion, config, data, native }: Readonly<{
  canUpdateCompletion: boolean;
  config: AppRuntimeConfig;
  data: ActivityWorkspaceDetail;
  native: NativeActivityData | undefined;
}>) {
  const dateFormat = dateTimeFormatter(config.locale, { dateStyle: "medium", timeStyle: "short", timeZone: config.timeZone });
  const typeLabel = data.resolution.kind === "api" ? data.resolution.definition.label : data.moduleType === "questionnaire" ? "アンケート" : data.moduleType === "autoattendmod" ? "出席" : data.moduleType;
  const deliveryLabel = data.delivery === "api" ? "公式API" : "HTML変換";
  const isForumHtmlFallback = data.moduleType === "forum" && native === undefined && data.htmlScreen !== null;
  const activityDetails = (
    <div className="ui-activity-details">
      <div className="ui-activity-state">
        {data.completion === "complete" ? <CheckCircle aria-hidden size={22} weight="fill" /> : <LockSimple aria-hidden size={22} />}
        <span><strong>{data.completion === "complete" ? "完了" : data.completion === "none" ? "完了条件なし" : "未完了"}</strong><small>{data.availability === "available" ? "利用可能" : "利用制限あり"}</small></span>
      </div>
      <dl>
        <div><dt>コース</dt><dd>{data.course.name}</dd></div>
        <div><dt>セクション</dt><dd>{data.section.name}</dd></div>
        {data.dates.map((date) => <div key={`${date.label}-${date.timestamp}`}><dt>{localizedDateLabel(date.label)}</dt><dd>{dateFormat.format(new Date(date.timestamp * 1_000))}</dd></div>)}
      </dl>
      <div className="ui-activity-delivery-state"><PuzzlePiece aria-hidden size={18} /><span>{deliveryLabel}</span></div>
      {canUpdateCompletion && data.completion !== "none" ? <CompletionToggle cmid={data.id} complete={data.completion === "complete"} /> : null}
      <TransitionLink className="ui-app-action-link" href={`/courses/${data.course.id}`} intent="return"><ArrowLeft aria-hidden size={15} />コース内容へ戻る</TransitionLink>
    </div>
  );

  return (
    <PageFrame
      content={(
        <div className="ui-activity-document" aria-label="アクティビティ作業面">
          {data.availability !== "available" ? <Notice title="現在このアクティビティは利用できません" tone="warning"><p>公開条件または受講条件を確認してください。</p></Notice> : null}
          {isEmptyMoodleDocument(data.description) ? isForumHtmlFallback ? null : <p className="ui-activity-empty">説明は登録されていません。</p> : <RichContent className="ui-rich-content" document={data.description} />}
          {native === undefined ? null : <NativePanel cmid={data.id} config={config} native={native} />}
          {data.htmlScreen === null ? null : data.moduleType === "forum" && native === undefined ? <ForumHtmlWorkspace cmid={data.id} screen={data.htmlScreen.screen} /> : <HtmlActivityWorkspace cmid={data.id} data={publicHtmlActivityScreen(data.htmlScreen)} />}
          {data.files.length === 0 ? null : <section className="ui-activity-files" aria-labelledby="activity-files-title"><h2 id="activity-files-title">教材ファイル</h2><ul className="ui-ledger">{data.files.map((file) => <li key={`${file.filename}-${file.filesize}`}><File aria-hidden size={19} /><span><strong>{file.filename}</strong><small>{file.mimetype} · {formatBytes(file.filesize)}</small></span>{file.downloadUrl === null ? <span>取得不可</span> : <a href={file.downloadUrl}><DownloadSimple aria-hidden size={17} />ダウンロード</a>}</li>)}</ul></section>}
        </div>
      )}
      header={<RouteHeader actions={<InspectorSheet description="完了状態、公開日時、API接続" label={<><Info aria-hidden size={17} />活動情報</>} title="活動情報">{activityDetails}</InspectorSheet>} description={`${data.section.name} · ${typeLabel}`} eyebrow={<TransitionLink href={`/courses/${data.course.id}`} intent="return"><ArrowLeft aria-hidden size={15} />{data.course.shortName}</TransitionLink>} metadata={`CMID ${data.id}`} shared={{ identifier: data.id, kind: "activity" }} title={data.name} />}
      mode="focus"
    />
  );
}
