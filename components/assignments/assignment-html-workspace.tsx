"use client";

import { CalendarDots, ClockCountdown, FileText, WarningCircle } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { MoodleScreenForm } from "@/components/activities/html-activity-workspace";
import { Badge, Card, Notice, RichContent } from "@/components/ui";
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
  return <dl className="ui-assignment-html__schedule m-0 grid divide-y divide-[var(--border-subtle)] rounded-[var(--shape-card)] bg-[var(--surface-inset)] px-4">{facts.map((fact) => <div className="grid grid-cols-[minmax(6.5rem,.58fr)_minmax(0,1fr)] gap-3 py-3 max-sm:grid-cols-1 max-sm:gap-1" key={`${fact.label}:${fact.value}`}><dt className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">{/期限|締切|終了/.test(fact.label) ? <ClockCountdown aria-hidden className="text-[var(--accent-400)]" size={17} /> : <CalendarDots aria-hidden className="text-[var(--accent-400)]" size={17} />}{fact.label}</dt><dd className="m-0 text-sm break-words">{fact.value}</dd></div>)}</dl>;
}

function StatusList({ facts }: Readonly<{ facts: readonly AssignmentHtmlFact[] }>) {
  if (facts.length === 0) return null;
  return <Card className="ui-assignment-html__status grid gap-4" aria-labelledby="assignment-status-title" padding="standard" tone="inset"><header className="flex items-start justify-between gap-3"><div className="grid gap-1"><span className="ui-kicker font-mono text-xs tracking-[.07em] text-[var(--accent-400)]">STATUS</span><h2 className="m-0 text-lg font-semibold" id="assignment-status-title">提出状況</h2></div><Badge tone={statusTone(facts)}>{statusLabel(facts)}</Badge></header><dl className="m-0 grid divide-y divide-[var(--border-subtle)]">{facts.map((fact) => <div className="grid gap-1 py-3" key={`${fact.label}:${fact.value}`}><dt className="text-xs font-semibold text-[var(--text-tertiary)]">{fact.label}</dt><dd className="m-0 text-sm break-words">{fact.value || "—"}</dd></div>)}</dl></Card>;
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
  const startFormIds = new Set(startForms.map((form) => form.id));
  const editForms = currentScreen.forms.filter((form) => !startFormIds.has(form.id));
  return <section className="ui-assignment-html grid w-full min-w-0 gap-6" data-testid="html-assignment-workspace">
    {currentScreen.state === "closed" ? <Notice title="提出受付は終了しています" tone="warning"><p>提出状況と、これまでに保存した内容を確認できます。</p></Notice> : null}
    {currentScreen.notices.map((notice, index) => <Notice key={`${notice.message}:${index}`} title="課題からのお知らせ" tone={notice.tone}><p>{notice.message}</p></Notice>)}
    <Card className="ui-assignment-html__overview grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,.9fr)]" aria-label="課題の期限と提出状況" padding="spacious" tone="selected"><div className="ui-assignment-html__overview-copy grid gap-2"><span className="ui-kicker font-mono text-xs tracking-[.07em] text-[var(--accent-400)]">ASSIGNMENT</span><h2 className="m-0 text-xl font-semibold">次にすること</h2><p className="m-0 max-w-lg text-sm leading-6 text-[var(--text-secondary)]">{currentScreen.forms.length > 0 ? "提出内容を入力し、確認後にMoodleへ保存できます。" : "この課題の現在の提出状況を確認できます。"}</p>{startForms.map((form) => <MoodleScreenForm actionEndpoint={actionEndpoint} className="ui-assignment-html__start mt-3 grid gap-3" form={form} key={`${form.id}:${form.revision}`} layout="compact-action" onScreenChange={setCurrentScreen} presentation="assignment" />)}</div><Schedule facts={view.schedule} /></Card>
    <div className="ui-assignment-html__grid grid items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,.8fr)]">
      {hasAssignmentHtmlDescription(view) ? <Card className="ui-assignment-html__description grid gap-4" aria-labelledby="assignment-description-title" padding="spacious" tone="default"><header className="grid gap-1"><span className="ui-kicker font-mono text-xs tracking-[.07em] text-[var(--accent-400)]">BRIEF</span><h2 className="m-0 text-lg font-semibold" id="assignment-description-title">課題の説明</h2></header><RichContent className="ui-rich-content leading-7 text-[var(--text-secondary)]" document={view.description} /></Card> : null}
      <StatusList facts={view.status} />
    </div>
    {editForms.map((form) => <MoodleScreenForm actionEndpoint={actionEndpoint} className="ui-assignment-html__form mt-2" form={form} key={`${form.id}:${form.revision}`} onPrevious={() => setCurrentScreen(screen)} onScreenChange={setCurrentScreen} presentation="assignment" />)}
    {currentScreen.forms.length === 0 ? <Notice title="この画面で行える操作はありません" tone="info"><FileText aria-hidden size={18} /><p>必要な情報は上部にまとめて表示しています。</p></Notice> : null}
    {currentScreen.state === "forbidden" ? <Notice title="この課題へのアクセス権がありません" tone="error"><WarningCircle aria-hidden size={18} /><p>Moodleの受講状態または提出条件を確認してください。</p></Notice> : null}
  </section>;
}
