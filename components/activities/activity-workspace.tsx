import {
  ArrowLeft,
  ArrowSquareOut,
  CheckCircle,
  DownloadSimple,
  File,
  Info,
  LockSimple,
  PuzzlePiece,
} from "@phosphor-icons/react/dist/ssr";

import { InspectorSheet } from "@/components/app-shell/inspector-sheet";
import { TransitionLink } from "@/components/app-shell/transitions";
import { ActionDock, PageFrame, RouteHeader } from "@/components/app-shell/workspace-frame";
import { Notice } from "@/components/ui";
import type { AppRuntimeConfig } from "@/lib/app-config";
import { dateTimeFormatter } from "@/lib/date-time";
import type { NativeActivityData } from "@/lib/moodle/activities/native";
import type { ActivityWorkspaceDetail } from "@/lib/moodle/queries/activity";
import { ChoiceWorkspace } from "./choice-workspace";
import { CompletionToggle } from "./completion-toggle";
import { DatabaseWorkspace } from "./database-workspace";
import { FeedbackWorkspace } from "./feedback-workspace";
import { ForumWorkspace } from "./forum-workspace";
import { GlossaryWorkspace } from "./glossary-workspace";
import { LessonWorkspace } from "./lesson-workspace";
import { LaunchWorkspace } from "./launch-workspace";
import { QuizWorkspace } from "./quiz-workspace";
import { QuestionnaireWorkspace } from "./questionnaire-workspace";
import { WikiWorkspace } from "./wiki-workspace";
import { WorkshopWorkspace } from "./workshop-workspace";
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

type CompanionBlock = NonNullable<ActivityWorkspaceDetail["companion"]>["blocks"][number];

function companionBlockKey(block: CompanionBlock): string {
  if (block.kind === "text") return `${block.kind}:${block.heading}:${block.text}`;
  if (block.kind === "facts") return `${block.kind}:${block.items.map((item) => `${item.label}:${item.value}`).join("|")}`;
  if (block.kind === "list") return `${block.kind}:${block.heading}:${block.items.join("|")}`;
  if (block.kind === "notice") return `${block.kind}:${block.tone}:${block.text}`;
  return `${block.kind}:${block.url}:${block.label}`;
}

function NativePanel({ cmid, config, native }: Readonly<{ cmid: number; config: AppRuntimeConfig; native: NativeActivityData }>) {
  if (native.kind === "quiz") return <QuizWorkspace cmid={cmid} data={native.data} />;
  if (native.kind === "database") return <DatabaseWorkspace cmid={cmid} data={native.data} />;
  if (native.kind === "forum") return <ForumWorkspace cmid={cmid} data={native.data} locale={config.locale} timeZone={config.timeZone} />;
  if (native.kind === "choice") return <ChoiceWorkspace cmid={cmid} data={native.data} />;
  if (native.kind === "feedback") return <FeedbackWorkspace cmid={cmid} data={native.data} />;
  if (native.kind === "glossary") return <GlossaryWorkspace cmid={cmid} data={native.data} />;
  if (native.kind === "lesson") return <LessonWorkspace cmid={cmid} data={native.data} />;
  if (native.kind === "launch") return <LaunchWorkspace cmid={cmid} data={native.data} />;
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
  const typeLabel = data.adapter.kind === "native" ? data.adapter.adapter.label : data.moduleType === "questionnaire" ? "アンケート" : data.moduleType;
  const deliveryLabel = data.delivery === "native" ? "公式API" : data.delivery === "adapter" ? "補助アダプター" : data.delivery === "runtime" ? "隔離ランタイム" : "未対応";
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
      <div className="ui-activity-adapter-state"><PuzzlePiece aria-hidden size={18} /><span>{deliveryLabel}</span></div>
      {canUpdateCompletion && data.completion !== "none" ? <CompletionToggle cmid={data.id} complete={data.completion === "complete"} /> : null}
      <TransitionLink className="ui-app-action-link" href={`/courses/${data.course.id}`} intent="return"><ArrowLeft aria-hidden size={15} />コース内容へ戻る</TransitionLink>
    </div>
  );

  return (
    <PageFrame
      actions={data.adapter.kind !== "native" && data.companion === null ? <ActionDock><span>この活動は安全な実行方式をまだ確認できていません</span>{data.sourceUrl === null ? <TransitionLink className="ui-app-action-link" href="/diagnostics" intent="switch">接続診断を確認</TransitionLink> : <a className="ui-app-action-link" href={data.sourceUrl} rel="noopener noreferrer" target="_blank">本家で続ける <ArrowSquareOut aria-hidden size={16} /></a>}</ActionDock> : undefined}
      content={(
        <div className="ui-activity-document" aria-label="アクティビティ作業面">
          {data.availability !== "available" ? <Notice title="現在このアクティビティは利用できません" tone="warning"><p>公開条件または受講条件を確認してください。</p></Notice> : null}
          {data.adapter.kind === "adapter_required" && data.companion === null ? <Notice title="この活動は本家 Moodle で続けます" tone="info"><p>回答や進捗を失わないため、この活動は本家 Moodle の安全な画面で開きます。本アプリには活動の状態と教材を表示し続けます。</p></Notice> : null}
          {data.adapter.kind === "unavailable" ? <Notice title="Moodle APIが許可されていません" tone="warning"><p>この活動に必要な公式Web Service関数をMoodle管理者が許可すると、ここで操作できます。</p></Notice> : null}
          {data.companion === null ? null : <section className="ui-companion-blocks" aria-label="拡張アダプター">{data.companion.blocks.map((block) => {
            const key = companionBlockKey(block);
            if (block.kind === "text") return <article key={key}><h2>{block.heading}</h2><p>{block.text}</p></article>;
            if (block.kind === "facts") return <dl key={key}>{block.items.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>;
            if (block.kind === "list") return <article key={key}><h2>{block.heading}</h2><ul>{block.items.map((item) => <li key={item}>{item}</li>)}</ul></article>;
            if (block.kind === "notice") return <Notice key={key} title="アダプターからのお知らせ" tone={block.tone === "danger" ? "error" : block.tone}><p>{block.text}</p></Notice>;
            return <a className="ui-app-action-link" href={block.url} key={key} rel="noopener noreferrer" target="_blank">{block.label}<ArrowSquareOut aria-hidden size={16} /></a>;
          })}</section>}
          {data.description === "" ? <p className="ui-activity-empty">説明は登録されていません。</p> : <section className="ui-rich-content" dangerouslySetInnerHTML={{ __html: data.description }} />}
          {data.companion?.activity?.kind === "questionnaire" ? <QuestionnaireWorkspace cmid={data.id} data={data.companion.activity} /> : null}
          {native === undefined ? null : <NativePanel cmid={data.id} config={config} native={native} />}
          {data.files.length === 0 ? null : <section className="ui-activity-files" aria-labelledby="activity-files-title"><h2 id="activity-files-title">教材ファイル</h2><ul className="ui-ledger">{data.files.map((file) => <li key={`${file.filename}-${file.filesize}`}><File aria-hidden size={19} /><span><strong>{file.filename}</strong><small>{file.mimetype} · {formatBytes(file.filesize)}</small></span>{file.downloadUrl === null ? <span>取得不可</span> : <a href={file.downloadUrl}><DownloadSimple aria-hidden size={17} />ダウンロード</a>}</li>)}</ul></section>}
        </div>
      )}
      header={<RouteHeader actions={<InspectorSheet description="完了状態、公開日時、API接続" label={<><Info aria-hidden size={17} />活動情報</>} title="活動情報">{activityDetails}</InspectorSheet>} description={`${data.section.name} · ${typeLabel}`} eyebrow={<TransitionLink href={`/courses/${data.course.id}`} intent="return"><ArrowLeft aria-hidden size={15} />{data.course.shortName}</TransitionLink>} metadata={`CMID ${data.id}`} shared={{ identifier: data.id, kind: "activity" }} title={data.name} />}
      mode="focus"
    />
  );
}
