"use client";

import { ArrowLeft, ArrowRight, CheckCircle, Play, SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import ky from "ky";
import { useRouter } from "next/navigation";
import { type MouseEvent, useEffect, useRef, useState } from "react";

import { Button, Card, DataList, DataListItem, Notice, RichContent, StickyActionBar } from "@/components/ui";
import type { QuizActivityData, QuizQuestion } from "@/lib/moodle/activities/quiz";

type SaveState = "idle" | "saving" | "saved" | "forbidden" | "error";
type ActionError = Exclude<SaveState, "idle" | "saving" | "saved">;

function attemptLabel(state: QuizActivityData["attempts"][number]["state"]): string {
  if (state === "inprogress") return "回答中";
  if (state === "finished") return "提出済み";
  if (state === "overdue") return "期限超過";
  return "中断";
}

function questionStatus(question: QuizQuestion): string {
  const status = question.status?.trim();
  if (status !== undefined && status !== "") {
    if (status === "Not yet answered") return "未解答";
    if (status === "Answer saved") return "保存済み";
    return status;
  }
  switch (question.state) {
    case "todo": return "未解答";
    case "complete": return "回答済み";
    case "gradedright": return "正解";
    case "gradedwrong": return "不正解";
    case "gaveup": return "未解答";
    case "needsgrading": return "採点待ち";
    default: return "回答中";
  }
}

function responseError(response: Response): ActionError {
  return response.status === 403 ? "forbidden" : "error";
}

function saveStateLabel(saveState: SaveState): string {
  if (saveState === "saving") return "保存中";
  if (saveState === "saved") return "保存済み";
  if (saveState === "forbidden") return "アクセスが禁止されています";
  if (saveState === "error") return "保存できません";
  return "変更は自動保存されます";
}

export function QuizWorkspace({ cmid, data }: Readonly<{ cmid: number; data: QuizActivityData }>) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [pendingAction, setPendingAction] = useState<"start" | "finish" | null>(null);
  const [actionError, setActionError] = useState<ActionError | null>(null);

  useEffect(() => () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    abortRef.current?.abort();
  }, []);

  function responses(): readonly Readonly<{ name: string; value: string }>[] {
    if (formRef.current === null) return [];
    return [...new FormData(formRef.current).entries()].flatMap(([name, value]) =>
      typeof value === "string" ? [{ name, value }] : []
    );
  }

  async function save(): Promise<boolean> {
    if (data.activeAttempt === null) return true;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSaveState("saving");
    try {
      const response = await ky.post(`/api/activities/${cmid}/quiz`, {
        json: { action: "save", attemptId: data.activeAttempt.attempt.id, responses: responses() },
        retry: 0,
        signal: controller.signal,
        throwHttpErrors: false,
      });
      setSaveState(response.ok ? "saved" : responseError(response));
      return response.ok;
    } catch {
      if (controller.signal.aborted) return false;
      setSaveState("error");
      return false;
    }
  }

  function scheduleSave(): void {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    setSaveState("idle");
    timerRef.current = setTimeout(() => void save(), 1_000);
  }

  function clearQuestionResponse(event: MouseEvent<HTMLFormElement>): void {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const clearControl = target.closest<HTMLButtonElement>('button[data-quiz-action="clear"]');
    if (clearControl === null || !event.currentTarget.contains(clearControl)) return;
    event.preventDefault();
    const question = clearControl.closest<HTMLElement>(".ui-quiz-question");
    if (question === null) return;

    let changed = false;
    for (const control of question.querySelectorAll<HTMLInputElement>('input[type="checkbox"], input[type="radio"], input[type="text"], input[type="number"]')) {
      if (control.disabled) continue;
      if (control.type === "checkbox" || control.type === "radio") {
        changed ||= control.checked;
        control.checked = false;
      } else {
        changed ||= control.value !== "";
        control.value = "";
      }
    }
    for (const control of question.querySelectorAll<HTMLSelectElement>("select")) {
      if (control.disabled) continue;
      changed ||= control.selectedIndex !== 0;
      control.selectedIndex = 0;
    }
    for (const control of question.querySelectorAll<HTMLTextAreaElement>("textarea")) {
      if (control.disabled) continue;
      changed ||= control.value !== "";
      control.value = "";
      if (control.dataset.editor === "moodle-response") control.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (!changed) return;
    scheduleSave();
    question.querySelector<HTMLElement>('input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not([aria-hidden="true"]):not(:disabled), [contenteditable="true"]')?.focus();
  }

  async function start(): Promise<void> {
    if (pendingAction !== null) return;
    setPendingAction("start");
    setActionError(null);
    try {
      const response = await ky.post(`/api/activities/${cmid}/quiz`, {
        json: { action: "start" }, retry: 0, throwHttpErrors: false,
      });
      if (response.ok) router.refresh();
      else setActionError(responseError(response));
    } catch {
      setActionError("error");
    } finally {
      setPendingAction(null);
    }
  }

  async function move(page: number): Promise<void> {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    if (await save()) router.push(`?page=${page}`);
  }

  async function finish(): Promise<void> {
    if (data.activeAttempt === null || pendingAction !== null) return;
    if (!window.confirm("回答を提出すると、通常は編集できなくなります。提出しますか？")) return;
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    abortRef.current?.abort();
    setPendingAction("finish");
    setActionError(null);
    try {
      const response = await ky.post(`/api/activities/${cmid}/quiz`, {
        json: { action: "finish", attemptId: data.activeAttempt.attempt.id, responses: responses() },
        retry: 0,
        throwHttpErrors: false,
      });
      if (response.ok) router.refresh();
      else setActionError(responseError(response));
    } catch {
      setActionError("error");
    } finally {
      setPendingAction(null);
    }
  }

  if (data.activeAttempt === null) {
    const attemptsRemaining = data.maxAttempts === 0 || data.attempts.length < data.maxAttempts;
    return (
      <section className="ui-quiz-start grid gap-5 rounded-[var(--shape-card)] bg-[var(--surface-primary)] p-4 sm:p-6" aria-labelledby="quiz-start-title">
        <div className="grid gap-1"><span className="ui-kicker font-mono text-xs tracking-[.08em] text-[var(--text-tertiary)]">ASSESSMENT</span><h2 className="m-0 text-xl font-semibold" id="quiz-start-title">小テストを開始</h2><p className="m-0 mt-1 text-sm leading-6 text-[var(--text-secondary)]">開始後は回答が自動保存されます。提出前に確認できます。</p></div>
        <dl className="m-0 grid gap-3 rounded-[var(--shape-card)] bg-[var(--surface-inset)] p-4 sm:grid-cols-2"><div className="grid gap-1"><dt className="text-xs text-[var(--text-tertiary)]">受験回数</dt><dd className="m-0 tabular-nums">{data.attempts.length}{data.maxAttempts === 0 ? " / 無制限" : ` / ${data.maxAttempts}`}</dd></div><div className="grid gap-1"><dt className="text-xs text-[var(--text-tertiary)]">制限時間</dt><dd className="m-0 tabular-nums">{data.timeLimit === 0 ? "なし" : `${Math.ceil(data.timeLimit / 60)}分`}</dd></div></dl>
        {data.hasQuestions && attemptsRemaining ? <Button disabled={pendingAction !== null} icon={<Play aria-hidden size={17} />} onClick={() => void start()}>{pendingAction === "start" ? "開始中" : "受験を開始"}</Button> : <Notice title="現在は開始できません" tone="warning"><p>設問または受験回数を確認してください。</p></Notice>}
        {actionError === null ? null : <Notice title={actionError === "forbidden" ? "アクセスが禁止されています" : "小テストを開始できません"} tone={actionError === "forbidden" ? "warning" : "error"} urgent><p>{actionError === "forbidden" ? "この小テストを開始する権限がありません。" : "Moodleとの通信中に問題が発生しました。時間をおいて再試行してください。"}</p></Notice>}
        {data.attempts.length > 0 ? <DataList className="ui-quiz-attempts" label="受験履歴">{data.attempts.map((attempt) => <DataListItem key={attempt.id} state={attempt.sumgrades == null ? undefined : <span className="text-sm tabular-nums">{attempt.sumgrades}点</span>} title={`第${attempt.attempt}回`} description={attemptLabel(attempt.state)} />)}</DataList> : null}
      </section>
    );
  }

  const active = data.activeAttempt;
  return (
    <form className="ui-quiz-attempt grid gap-5 pb-24" onClick={clearQuestionResponse} onInput={scheduleSave} onSubmit={(event) => event.preventDefault()} ref={formRef}>
      <header className="ui-quiz-attempt__header flex flex-wrap items-end justify-between gap-4"><div className="grid gap-1"><span className="ui-kicker font-mono text-xs tracking-[.08em] text-[var(--text-tertiary)]">第 {active.attempt.attempt} 回の受験</span><h2 className="m-0 text-xl font-semibold">回答ページ {active.page + 1}</h2></div><div className="ui-quiz-attempt__summary flex flex-wrap items-center justify-end gap-3"><span className="ui-quiz-page-count text-xs text-[var(--text-tertiary)]">このページ: {active.questions.length}問</span><span className={`ui-quiz-save ui-quiz-save--${saveState} inline-flex min-h-7 items-center gap-1.5 text-xs ${saveState === "saved" ? "text-[var(--status-success)]" : saveState === "forbidden" || saveState === "error" ? "text-[var(--status-error)]" : "text-[var(--text-tertiary)]"}`} aria-live="polite">{saveState === "saving" ? <SpinnerGap aria-hidden className="animate-spin" size={15} /> : saveState === "saved" ? <CheckCircle aria-hidden size={15} /> : saveState === "forbidden" || saveState === "error" ? <WarningCircle aria-hidden size={15} /> : null}{saveStateLabel(saveState)}</span></div></header>
      {active.messages.map((message) => <Notice key={message} title="受験条件" tone="warning"><p>{message}</p></Notice>)}
      {saveState === "forbidden" ? <Notice title="アクセスが禁止されています" tone="warning" urgent><p>この回答を保存する権限がありません。受講条件を確認してください。</p></Notice> : null}
      {saveState === "error" ? <Notice action={<Button onClick={() => void save()} size="compact" variant="secondary">再試行</Button>} title="回答を保存できません" tone="error" urgent><p>入力はこの画面に残っています。通信を確認して再試行してください。</p></Notice> : null}
      {actionError === null ? null : <Notice title={actionError === "forbidden" ? "アクセスが禁止されています" : "回答を提出できません"} tone={actionError === "forbidden" ? "warning" : "error"} urgent><p>{actionError === "forbidden" ? "この小テストを更新する権限がありません。" : "Moodleとの通信中に問題が発生しました。入力は保持されています。"}</p></Notice>}
      <div className="ui-quiz-questions grid gap-5">
        {active.questions.map((question) => <Card className="ui-quiz-question overflow-hidden" padding="none" key={question.slot} tone="elevated"><header className="ui-quiz-question__meta flex min-h-12 flex-wrap items-center justify-between gap-3 bg-[var(--surface-inset)] px-4 py-2"><h3 className="m-0 text-sm font-semibold">問題 {question.slot}</h3><div className="flex flex-wrap items-center justify-end gap-2"><span className="rounded-full bg-[var(--surface-elevated)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">{questionStatus(question)}</span>{question.maximumMark === null ? null : <small className="text-xs tabular-nums text-[var(--text-tertiary)]">{question.maximumMark}</small>}</div></header><RichContent className="ui-quiz-question__body p-4 sm:p-6" document={question.document} onInput={scheduleSave} variant="quiz" /></Card>)}
      </div>
      <StickyActionBar aria-label="小テスト操作" className="ui-quiz-actions justify-between">
        <Button disabled={active.page === 0 || pendingAction !== null} onClick={() => void move(active.page - 1)} type="button" variant="secondary"><ArrowLeft aria-hidden size={17} />前へ</Button>
        <span className="text-center text-xs text-[var(--text-tertiary)] max-sm:hidden">{saveState === "saved" ? "回答は保存されています" : "変更は1秒後に自動保存されます"}</span>
        {active.nextPage >= 0 ? <Button disabled={pendingAction !== null} onClick={() => void move(active.nextPage)} type="button">次へ<ArrowRight aria-hidden size={17} /></Button> : <Button disabled={pendingAction !== null} onClick={() => void finish()} type="button">{pendingAction === "finish" ? "提出中" : "回答を提出"}</Button>}
      </StickyActionBar>
    </form>
  );
}
