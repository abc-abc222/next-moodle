"use client";

import { ArrowLeft, ChalkboardTeacher, CheckCircle, PaperPlaneRight, ShieldCheck, UsersThree } from "@phosphor-icons/react";
import ky, { isKyError } from "ky";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useReducer } from "react";
import { z } from "zod";

import { TransitionLink } from "@/components/app-shell/transitions";
import { PageFrame, RouteHeader } from "@/components/app-shell/workspace-frame";
import { Button, Card, EmptyState, Field, Notice, StickyActionBar, Textarea } from "@/components/ui";

const RecipientSchema = z.object({
  avatarUrl: z.string().nullable(),
  canMessage: z.boolean(),
  displayName: z.string(),
  kind: z.enum(["teacher", "student"]),
  recipientKey: z.string(),
  roles: z.array(z.string()),
});
const RecipientsResponseSchema = z.object({ ok: z.literal(true), result: z.array(RecipientSchema) });
const SendResponseSchema = z.object({
  ok: z.literal(true),
  result: z.object({ conversationId: z.number().int().positive(), messageId: z.number().int().positive() }),
});

type CourseOption = Readonly<{ id: number; name: string; shortName: string }>;
type RecipientKind = "teacher" | "student";
type Recipient = z.infer<typeof RecipientSchema>;
type ContactStep = "course" | "recipient" | "compose";
type ContactStatus = "idle" | "sending" | "error";
type ContactState = Readonly<{
  body: string;
  courseId: number | null;
  loadingRecipients: boolean;
  message: string;
  recipientKey: string;
  recipientKind: RecipientKind;
  recipientQuery: string;
  recipients: readonly Recipient[];
  reviewing: boolean;
  status: ContactStatus;
  step: ContactStep;
}>;
type ContactAction =
  | Readonly<{ type: "body_changed"; value: string }>
  | Readonly<{ courseId: number; type: "course_selected" }>
  | Readonly<{ type: "recipient_kind_changed"; value: RecipientKind }>
  | Readonly<{ type: "recipient_query_changed"; value: string }>
  | Readonly<{ type: "recipient_selected"; value: string }>
  | Readonly<{ type: "review_changed"; value: boolean }>
  | Readonly<{ type: "send_failed"; message: string }>
  | Readonly<{ type: "sending" }>
  | Readonly<{ recipients: readonly Recipient[]; type: "recipients_loaded" }>
  | Readonly<{ message: string; type: "recipients_failed" }>;

function initialContactState(courses: readonly CourseOption[], initialCourseId: number | null): ContactState {
  return {
    body: "",
    courseId: courses.some((course) => course.id === initialCourseId) ? initialCourseId : courses[0]?.id ?? null,
    loadingRecipients: courses.length > 0,
    message: "",
    recipientKey: "",
    recipientKind: "teacher",
    recipientQuery: "",
    recipients: [],
    reviewing: false,
    status: "idle",
    step: "course",
  };
}

function contactReducer(state: ContactState, action: ContactAction): ContactState {
  switch (action.type) {
    case "body_changed": return { ...state, body: action.value, reviewing: false };
    case "course_selected": return { ...state, courseId: action.courseId, loadingRecipients: true, message: "", recipientKey: "", recipientQuery: "", reviewing: false, status: "idle", step: "recipient", recipients: [] };
    case "recipient_kind_changed": return { ...state, loadingRecipients: true, message: "", recipientKey: "", recipientKind: action.value, recipientQuery: "", reviewing: false, status: "idle", step: "recipient", recipients: [] };
    case "recipient_query_changed": return { ...state, recipientQuery: action.value, reviewing: false };
    case "recipient_selected": return { ...state, recipientKey: action.value, reviewing: false, step: action.value === "" ? state.step : "compose" };
    case "review_changed": return { ...state, reviewing: action.value };
    case "send_failed": return { ...state, message: action.message, status: "error" };
    case "sending": return { ...state, message: "", status: "sending" };
    case "recipients_failed": return { ...state, loadingRecipients: false, message: action.message };
    case "recipients_loaded": {
      const first = action.recipients.find((recipient) => recipient.canMessage);
      return { ...state, loadingRecipients: false, recipientKey: first?.recipientKey ?? "", recipients: action.recipients };
    }
    default: return state;
  }
}

function errorMessage(code: string): string {
  if (code === "recipient_expired") return "宛先の有効期限が切れました。相手を選び直してください。";
  if (code === "message_rejected") return "Moodleの受信設定により送信できません。相手の受信設定を確認してください。";
  if (code === "permission" || code === "recipient_not_allowed") return "このコースの参加者へ送信する権限を確認できませんでした。";
  if (code === "configuration_error") return "Moodle管理者によるメッセージAPIの許可が必要です。";
  return "送信できませんでした。入力内容は保持されています。";
}

export function TeacherContactForm({ courses, initialCourseId = null }: Readonly<{
  courses: readonly CourseOption[];
  initialCourseId?: number | null;
}>) {
  const router = useRouter();
  const [state, dispatch] = useReducer(contactReducer, undefined, () => initialContactState(courses, initialCourseId));
  const { body, courseId, loadingRecipients, message, recipientKey, recipientKind, recipientQuery, recipients, reviewing, status, step } = state;
  const selectedCourse = useMemo(() => courses.find((course) => course.id === courseId), [courseId, courses]);
  const selectedRecipient = useMemo(() => recipients.find((recipient) => recipient.recipientKey === recipientKey), [recipientKey, recipients]);
  const visibleRecipients = useMemo(() => {
    const query = recipientQuery.trim().toLocaleLowerCase("ja-JP");
    return query === "" ? recipients : recipients.filter((recipient) => recipient.displayName.toLocaleLowerCase("ja-JP").includes(query));
  }, [recipientQuery, recipients]);

  useEffect(() => {
    if (courseId === null) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ courseId: String(courseId), kind: recipientKind });
    void ky.get(`/api/messages/recipients?${params.toString()}`, {
      cache: "no-store",
      retry: 0,
      signal: controller.signal,
      timeout: 12_000,
    }).json().then((payload) => {
      const parsed = RecipientsResponseSchema.safeParse(payload);
      if (!parsed.success) throw new Error("invalid_response");
      dispatch({ recipients: parsed.data.result, type: "recipients_loaded" });
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      if (!isKyError(error) && !(error instanceof Error)) throw error;
      dispatch({ message: "参加者を取得できませんでした。コースとMoodleの権限設定を確認してください。", type: "recipients_failed" });
    });
    return () => controller.abort();
  }, [courseId, recipientKind]);

  function selectCourse(nextCourseId: number): void {
    if (nextCourseId === courseId) return;
    dispatch({ courseId: nextCourseId, type: "course_selected" });
  }

  async function submit(): Promise<void> {
    if (courseId === null || recipientKey === "" || body.trim() === "" || status === "sending") return;
    dispatch({ type: "sending" });
    try {
      const response = await ky.post("/api/messages", {
        json: { body, clientRequestId: crypto.randomUUID(), courseId, recipientKey },
        retry: 0,
        throwHttpErrors: false,
        timeout: 20_000,
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const code = typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "object" && payload.error !== null && "code" in payload.error && typeof payload.error.code === "string" ? payload.error.code : "message_send_failed";
        dispatch({ message: errorMessage(code), type: "send_failed" });
        return;
      }
      const parsed = SendResponseSchema.safeParse(payload);
      if (!parsed.success) throw new Error("invalid_response");
      router.push(`/messages/${parsed.data.result.conversationId}`);
      router.refresh();
    } catch (error) {
      if (!isKyError(error) && !(error instanceof Error)) throw error;
      dispatch({ message: "送信できませんでした。入力内容は保持されています。", type: "send_failed" });
    }
  }

  const recipientLabel = recipientKind === "teacher" ? "先生" : "学生";
  const command = (
    <StickyActionBar className="ui-teacher-compose__command rounded-none shadow-none">
      <span className="mr-auto text-xs text-[var(--text-tertiary)]">{status === "sending" ? "Moodleへ送信中…" : "送信前に宛先とメッセージを確認できます"}</span>
      {reviewing ? (
        <div className="flex flex-wrap gap-2"><Button onClick={() => dispatch({ type: "review_changed", value: false })} type="button" variant="secondary">修正する</Button><Button disabled={status === "sending"} onClick={submit} type="button" variant="primary"><PaperPlaneRight aria-hidden size={18} />{status === "sending" ? "送信中" : "送信を確定"}</Button></div>
      ) : (
        <Button disabled={recipientKey === "" || body.trim() === "" || status === "sending"} onClick={() => dispatch({ type: "review_changed", value: true })} type="button" variant="primary">送信内容を確認</Button>
      )}
    </StickyActionBar>
  );

  return (
    <PageFrame
      actions={command}
      className="ui-teacher-contact"
      content={<div className="grid min-w-0 gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="grid content-start gap-5">
          <Card className="ui-teacher-courses" padding="compact" tone="inset">
            <header className="flex min-h-11 items-center justify-between gap-3 px-2"><h2 className="m-0 text-base font-semibold">1. コース</h2><span className="text-xs text-[var(--text-tertiary)]">{courses.length}</span></header>
            {courses.length === 0 ? <EmptyState title="受講コースがありません">コースへ参加すると、担当教員や受講生を選択できます。</EmptyState> : (
              <nav aria-label="メッセージを送るコース" className="grid max-h-64 overflow-y-auto">
                {courses.map((course) => (
                  <button aria-pressed={course.id === courseId} className="grid min-h-14 grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3 rounded-[var(--shape-control)] border-0 bg-transparent px-2 text-left text-[var(--text-primary)] transition-colors duration-[120ms] hover:bg-[var(--surface-elevated)] aria-pressed:bg-[var(--surface-selected)]" key={course.id} onClick={() => selectCourse(course.id)} type="button">
                    <span className="grid size-10 place-items-center rounded-full bg-[var(--accent-500)] font-bold text-[var(--accent-contrast)]">{course.shortName.slice(0, 1)}</span><span className="grid min-w-0"><strong className="truncate">{course.name}</strong><small className="truncate text-xs text-[var(--text-tertiary)]">{course.shortName}</small></span>
                  </button>
                ))}
              </nav>
            )}
          </Card>
          <Card className="ui-teacher-recipient grid gap-4" padding="standard" tone="inset">
            <header className="flex items-center justify-between gap-3"><h2 className="m-0 text-base font-semibold">2. 相手を選ぶ</h2><span className="text-xs text-[var(--text-tertiary)]">{loadingRecipients ? "確認中" : `${recipients.length}人`}</span></header>
            <div aria-label="宛先の種類" className="grid grid-cols-2 gap-1 rounded-[var(--shape-control)] bg-[var(--surface-inset)] p-1" role="tablist">
              {(["teacher", "student"] as const).map((kind) => <button aria-selected={recipientKind === kind} className="min-h-10 rounded-[calc(var(--shape-control)-.25rem)] border-0 bg-transparent px-3 text-sm font-semibold text-[var(--text-secondary)] transition-colors aria-selected:bg-[var(--surface-elevated)] aria-selected:text-[var(--text-primary)]" key={kind} onClick={() => dispatch({ type: "recipient_kind_changed", value: kind })} role="tab" type="button">{kind === "teacher" ? "先生" : "学生"}</button>)}
            </div>
            {recipientKind === "student" ? <Field autoComplete="off" id="message-recipient-search" label="学生を検索" onChange={(event) => dispatch({ type: "recipient_query_changed", value: event.currentTarget.value })} placeholder="名前で絞り込む" value={recipientQuery} /> : null}
            <label className="ui-teacher-select grid gap-2 text-xs font-semibold">
              <span>送信先</span>
              <select aria-label="送信先" className="min-h-11 w-full rounded-[var(--shape-control)] border-0 bg-[var(--surface-elevated)] px-3 shadow-[var(--shadow-control)]" disabled={loadingRecipients || visibleRecipients.length === 0} onChange={(event) => dispatch({ type: "recipient_selected", value: event.currentTarget.value })} value={recipientKey}>
                <option value="">{loadingRecipients ? "確認中…" : `${recipientLabel}を選択`}</option>
                {visibleRecipients.map((recipient) => <option disabled={!recipient.canMessage} key={recipient.recipientKey} value={recipient.recipientKey}>{recipient.displayName} — {recipient.roles.join(" / ")}</option>)}
              </select>
            </label>
            <div className="ui-teacher-person grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-[var(--accent-500)] font-bold text-[var(--accent-contrast)]">{selectedRecipient?.displayName.slice(0, 1) ?? "?"}</span><div className="grid min-w-0"><strong className="truncate">{selectedRecipient?.displayName ?? "未選択"}</strong><small className="truncate text-xs text-[var(--text-tertiary)]">{selectedRecipient?.roles.join(" / ") ?? `${recipientLabel}を選択`}</small></div></div>
            <div className="ui-teacher-safety grid grid-cols-[auto_minmax(0,1fr)] gap-2 text-[var(--accent-400)]"><ShieldCheck aria-hidden size={20} /><p className="m-0 text-xs leading-5 text-[var(--text-secondary)]">送信直前にコース参加状況と受信可否を再確認します。</p></div>
          </Card>
        </aside>
        <Card as="section" className="ui-teacher-compose" padding="spacious" tone="default">
          <header className="mb-6 flex items-start justify-between gap-4"><div><h2 className="m-0 text-lg font-semibold">3. メッセージ</h2><p className="m-0 mt-1 text-sm text-[var(--text-secondary)]">{selectedRecipient?.displayName ?? "相手を選択"} · {selectedCourse?.name ?? "コースを選択"}</p></div>{recipientKind === "teacher" ? <ChalkboardTeacher aria-hidden className="text-[var(--accent-400)]" size={22} /> : <UsersThree aria-hidden className="text-[var(--accent-400)]" size={22} />}</header>
          <div className="ui-teacher-compose__body grid gap-5">
            <Textarea label="メッセージ" maxLength={10_000} onChange={(event) => dispatch({ type: "body_changed", value: event.currentTarget.value })} placeholder="用件や確認したいことを入力してください" rows={12} value={body} />
            {reviewing ? (
              <Card as="section" className="ui-teacher-review" padding="standard" tone="selected">
                <header className="flex gap-3 text-[var(--accent-400)]"><CheckCircle aria-hidden className="shrink-0" size={20} /><div><h3 className="m-0 text-base text-[var(--text-primary)]" id="teacher-review-title">送信前の確認</h3><p className="m-0 mt-1 text-xs text-[var(--text-secondary)]">Moodleの会話として送信します。件名はありません。</p></div></header>
                <dl className="m-0 mt-4 grid divide-y divide-[var(--border-subtle)]">{[["宛先", selectedRecipient?.displayName ?? "未選択"], ["種類", recipientLabel], ["コース", selectedCourse?.name ?? "未選択"], ["本文冒頭", `${body.trim().slice(0, 120)}${body.trim().length > 120 ? "…" : ""}`], ["再検証", "コース参加状況 / 受信可否"]].map(([label, value]) => <div className="grid min-h-11 grid-cols-[6rem_minmax(0,1fr)] items-center gap-3 py-2 text-sm max-sm:grid-cols-1 max-sm:gap-1" key={label}><dt className="text-xs text-[var(--text-tertiary)]">{label}</dt><dd className="m-0 break-words">{value}</dd></div>)}</dl>
              </Card>
            ) : null}
            {message === "" ? null : <Notice title="送信を完了できませんでした" tone="error" urgent>{message}</Notice>}
          </div>
        </Card>
      </div>}
      header={<RouteHeader actions={<TransitionLink className="ui-app-action-link" href="/messages" intent="return"><ArrowLeft aria-hidden size={18} />会話へ戻る</TransitionLink>} description="受講コースの先生や学生と、Moodleの会話を始めます。" eyebrow="新規メッセージ" title="新しいメッセージ" />}
      mode="focus"
      state={step}
      width="wide"
    />
  );
}
