"use client";

import { CalendarDots, ClockCountdown, FileText, WarningCircle } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { MoodleScreenForm } from "@/components/activities/html-activity-workspace";
import { Badge, Notice, RichContent } from "@/components/ui";
import {
  hasAssignmentHtmlDescription,
  projectAssignmentHtmlScreen,
  type AssignmentHtmlFact,
} from "@/lib/moodle/activities/assignment-html-view";
import type { MoodleScreenModel } from "@/lib/moodle/page-model";

function statusTone(status: readonly AssignmentHtmlFact[]): "accent" | "success" | "warning" {
  const value = status.find((fact) => /提出(?:ステータス|状況)/.test(fact.label))?.value ?? "";
  if (/提出済み|送信済み|提出完了/.test(value)) return "success";
  return value === "" ? "accent" : "warning";
}

function statusLabel(status: readonly AssignmentHtmlFact[]): string {
  return status.find((fact) => /提出(?:ステータス|状況)/.test(fact.label))?.value || "提出状況を確認";
}

function Schedule({ facts }: Readonly<{ facts: readonly AssignmentHtmlFact[] }>) {
  if (facts.length === 0) return null;
  return <dl className="ui-assignment-html__schedule">{facts.map((fact) => <div key={`${fact.label}:${fact.value}`}><dt>{/期限|締切|終了/.test(fact.label) ? <ClockCountdown aria-hidden size={17} /> : <CalendarDots aria-hidden size={17} />}{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>;
}

function StatusList({ facts }: Readonly<{ facts: readonly AssignmentHtmlFact[] }>) {
  if (facts.length === 0) return null;
  return <section className="ui-assignment-html__status" aria-labelledby="assignment-status-title"><header><div><span className="ui-kicker">STATUS</span><h2 id="assignment-status-title">提出状況</h2></div><Badge tone={statusTone(facts)}>{statusLabel(facts)}</Badge></header><dl>{facts.map((fact) => <div key={`${fact.label}:${fact.value}`}><dt>{fact.label}</dt><dd>{fact.value || "—"}</dd></div>)}</dl></section>;
}

export function AssignmentHtmlWorkspace({ actionEndpoint, screen }: Readonly<{
  actionEndpoint: string;
  screen: MoodleScreenModel;
}>) {
  const [currentScreen, setCurrentScreen] = useState(screen);
  const initialView = useMemo(() => projectAssignmentHtmlScreen(screen), [screen]);
  const currentView = useMemo(() => projectAssignmentHtmlScreen(currentScreen), [currentScreen]);
  const view = {
    description: hasAssignmentHtmlDescription(currentView) ? currentView.description : initialView.description,
    schedule: currentView.schedule.length > 0 ? currentView.schedule : initialView.schedule,
    status: currentView.status.length > 0 ? currentView.status : initialView.status,
  };
  const startForms = currentScreen.forms.filter((form) => form.controls.length === 0 && form.actions.some((action) => action.purpose === "next"));
  const editForms = currentScreen.forms.filter((form) => !startForms.includes(form));
  return <section className="ui-assignment-html" data-testid="html-assignment-workspace">
    {currentScreen.state === "closed" ? <Notice title="提出受付は終了しています" tone="warning"><p>提出状況と、これまでに保存した内容を確認できます。</p></Notice> : null}
    {currentScreen.notices.map((notice, index) => <Notice key={`${notice.message}:${index}`} title="課題からのお知らせ" tone={notice.tone}><p>{notice.message}</p></Notice>)}
    <section className="ui-assignment-html__overview" aria-label="課題の期限と提出状況"><div className="ui-assignment-html__overview-copy"><span className="ui-kicker">ASSIGNMENT</span><h2>次にすること</h2><p>{currentScreen.forms.length > 0 ? "提出内容を入力し、確認後にMoodleへ保存できます。" : "この課題の現在の提出状況を確認できます。"}</p>{startForms.map((form) => <MoodleScreenForm actionEndpoint={actionEndpoint} className="ui-assignment-html__start" form={form} key={`${form.id}:${form.revision}`} layout="compact-action" onScreenChange={setCurrentScreen} presentation="assignment" />)}</div><Schedule facts={view.schedule} /></section>
    <div className="ui-assignment-html__grid">
      {hasAssignmentHtmlDescription(view) ? <section className="ui-assignment-html__description" aria-labelledby="assignment-description-title"><header><span className="ui-kicker">BRIEF</span><h2 id="assignment-description-title">課題の説明</h2></header><RichContent className="ui-rich-content" document={view.description} /></section> : null}
      <StatusList facts={view.status} />
    </div>
    {editForms.map((form) => <MoodleScreenForm actionEndpoint={actionEndpoint} className="ui-assignment-html__form" form={form} key={`${form.id}:${form.revision}`} onPrevious={() => setCurrentScreen(screen)} onScreenChange={setCurrentScreen} presentation="assignment" />)}
    {currentScreen.forms.length === 0 ? <Notice title="この画面で行える操作はありません" tone="info"><FileText aria-hidden size={18} /><p>必要な情報は上部にまとめて表示しています。</p></Notice> : null}
    {currentScreen.state === "forbidden" ? <Notice title="この課題へのアクセス権がありません" tone="error"><WarningCircle aria-hidden size={18} /><p>Moodleの受講状態または提出条件を確認してください。</p></Notice> : null}
  </section>;
}
