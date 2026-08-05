"use client";

import { ArrowLeft, ChalkboardTeacher, CheckCircle, PaperPlaneRight, ShieldCheck } from "@phosphor-icons/react";
import ky, { isKyError } from "ky";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useReducer } from "react";
import { z } from "zod";

import { TransitionLink } from "@/components/app-shell/transitions";
import { PageFrame, RouteHeader } from "@/components/app-shell/workspace-frame";
import { Button, Card, EmptyState, Field, Notice, StickyActionBar, Textarea } from "@/components/ui";

const TeacherSchema = z.object({
  avatarUrl: z.string().nullable(),
  canMessage: z.boolean(),
  displayName: z.string(),
  recipientKey: z.string(),
  roles: z.array(z.string()),
});
const TeachersResponseSchema = z.object({ ok: z.literal(true), result: z.array(TeacherSchema) });
const SendResponseSchema = z.object({
  ok: z.literal(true),
  result: z.object({ conversationId: z.number().int().positive(), messageId: z.number().int().positive() }),
});

type CourseOption = Readonly<{ id: number; name: string; shortName: string }>;
type Teacher = z.infer<typeof TeacherSchema>;
type ContactStep = "course" | "recipient" | "compose";
type ContactStatus = "idle" | "sending" | "error";
type ContactState = Readonly<{
  body: string;
  courseId: number | null;
  loadingTeachers: boolean;
  message: string;
  recipientKey: string;
  reviewing: boolean;
  status: ContactStatus;
  step: ContactStep;
  subject: string;
  teachers: readonly Teacher[];
}>;
type ContactAction =
  | Readonly<{ type: "body_changed"; value: string }>
  | Readonly<{ courseId: number; type: "course_selected" }>
  | Readonly<{ type: "recipient_selected"; value: string }>
  | Readonly<{ type: "review_changed"; value: boolean }>
  | Readonly<{ type: "send_failed"; message: string }>
  | Readonly<{ type: "sending" }>
  | Readonly<{ step: ContactStep; type: "step_changed" }>
  | Readonly<{ type: "subject_changed"; value: string }>
  | Readonly<{ teachers: readonly Teacher[]; type: "teachers_loaded" }>
  | Readonly<{ message: string; type: "teachers_failed" }>;

function initialContactState(courses: readonly CourseOption[], initialCourseId: number | null): ContactState {
  return {
    body: "",
    courseId: courses.some((course) => course.id === initialCourseId) ? initialCourseId : courses[0]?.id ?? null,
    loadingTeachers: courses.length > 0,
    message: "",
    recipientKey: "",
    reviewing: false,
    status: "idle",
    step: "course",
    subject: "",
    teachers: [],
  };
}

function contactReducer(state: ContactState, action: ContactAction): ContactState {
  switch (action.type) {
    case "body_changed": return { ...state, body: action.value, reviewing: false };
    case "course_selected": return { ...state, courseId: action.courseId, loadingTeachers: true, message: "", recipientKey: "", reviewing: false, status: "idle", step: "recipient", teachers: [] };
    case "recipient_selected": return { ...state, recipientKey: action.value, reviewing: false, step: action.value === "" ? state.step : "compose" };
    case "review_changed": return { ...state, reviewing: action.value };
    case "send_failed": return { ...state, message: action.message, status: "error" };
    case "sending": return { ...state, message: "", status: "sending" };
    case "step_changed": return { ...state, step: action.step };
    case "subject_changed": return { ...state, reviewing: false, subject: action.value };
    case "teachers_failed": return { ...state, loadingTeachers: false, message: action.message };
    case "teachers_loaded": {
      const first = action.teachers.find((teacher) => teacher.canMessage);
      return { ...state, loadingTeachers: false, recipientKey: first?.recipientKey ?? "", teachers: action.teachers };
    }
  }
}

function errorMessage(code: string): string {
  if (code === "recipient_expired") return "宛先の有効期限が切れました。先生を選び直してください。";
  if (code === "message_rejected") return "Moodleの受信設定により送信できません。連絡先申請または受信設定を確認してください。";
  if (code === "permission" || code === "recipient_not_allowed") return "このコースの担当者へ送信する権限を確認できませんでした。";
  if (code === "configuration_error") return "Moodle管理者によるメッセージAPIの許可が必要です。";
  return "送信できませんでした。入力内容は保持されています。";
}

export function TeacherContactForm({ courses, initialCourseId = null }: Readonly<{
  courses: readonly CourseOption[];
  initialCourseId?: number | null;
}>) {
  const router = useRouter();
  const [state, dispatch] = useReducer(contactReducer, undefined, () => initialContactState(courses, initialCourseId));
  const { body, courseId, loadingTeachers, message, recipientKey, reviewing, status, step, subject, teachers } = state;
  const selectedCourse = useMemo(() => courses.find((course) => course.id === courseId), [courseId, courses]);
  const selectedTeacher = useMemo(() => teachers.find((teacher) => teacher.recipientKey === recipientKey), [recipientKey, teachers]);

  useEffect(() => {
    if (courseId === null) return;
    const controller = new AbortController();
    void ky.get(`/api/messages/teachers?courseId=${courseId}`, {
      cache: "no-store",
      retry: 0,
      signal: controller.signal,
      timeout: 12_000,
    }).json().then((payload) => {
      const parsed = TeachersResponseSchema.safeParse(payload);
      if (!parsed.success) throw new Error("invalid_response");
      dispatch({ teachers: parsed.data.result, type: "teachers_loaded" });
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      if (!isKyError(error) && !(error instanceof Error)) throw error;
      dispatch({ message: "担当教員を取得できませんでした。コースとMoodleの権限設定を確認してください。", type: "teachers_failed" });
    });
    return () => controller.abort();
  }, [courseId]);

  function selectCourse(nextCourseId: number): void {
    if (nextCourseId === courseId) return;
    dispatch({ courseId: nextCourseId, type: "course_selected" });
  }

  async function submit(): Promise<void> {
    if (courseId === null || recipientKey === "" || subject.trim() === "" || body.trim() === "" || status === "sending") return;
    dispatch({ type: "sending" });
    try {
      const response = await ky.post("/api/messages", {
        json: { body, clientRequestId: crypto.randomUUID(), courseId, recipientKey, subject },
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

  const command = (
    <StickyActionBar className="ui-teacher-compose__command rounded-none shadow-none">
      <span className="mr-auto text-xs text-[var(--text-tertiary)]">{status === "sending" ? "Moodleへ送信中…" : "入力は送信に成功するまで保持されます"}</span>
      {reviewing ? (
        <div className="flex flex-wrap gap-2"><Button onClick={() => dispatch({ type: "review_changed", value: false })} type="button" variant="secondary">修正する</Button><Button disabled={status === "sending"} onClick={submit} type="button" variant="primary"><PaperPlaneRight aria-hidden size={18} />{status === "sending" ? "送信中" : "送信を確定"}</Button></div>
      ) : (
        <Button disabled={recipientKey === "" || subject.trim() === "" || body.trim() === "" || status === "sending"} onClick={() => dispatch({ type: "review_changed", value: true })} type="button" variant="primary">送信内容を確認</Button>
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
            {courses.length === 0 ? <EmptyState title="受講コースがありません">コースへ参加すると、担当教員を選択できます。</EmptyState> : (
              <nav aria-label="連絡するコース" className="grid max-h-64 overflow-y-auto">
                {courses.map((course) => (
                  <button aria-pressed={course.id === courseId} className="grid min-h-14 grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3 rounded-[var(--shape-control)] border-0 bg-transparent px-2 text-left text-[var(--text-primary)] transition-colors duration-[120ms] hover:bg-[var(--surface-elevated)] aria-pressed:bg-[var(--surface-selected)]" key={course.id} onClick={() => selectCourse(course.id)} type="button">
                    <span className="grid size-10 place-items-center rounded-full bg-[var(--accent-500)] font-bold text-[var(--accent-contrast)]">{course.shortName.slice(0, 1)}</span><span className="grid min-w-0"><strong className="truncate">{course.name}</strong><small className="truncate text-xs text-[var(--text-tertiary)]">{course.shortName}</small></span>
                  </button>
                ))}
              </nav>
            )}
          </Card>
          <Card className="ui-teacher-recipient grid gap-4" padding="standard" tone="inset">
            <header className="flex items-center justify-between gap-3"><h2 className="m-0 text-base font-semibold">2. 担当教員</h2><span className="text-xs text-[var(--text-tertiary)]">{loadingTeachers ? "確認中" : `${teachers.length}人`}</span></header>
            <label className="ui-teacher-select grid gap-2 text-xs font-semibold">
              <span>送信先</span>
              <select className="min-h-11 w-full rounded-[var(--shape-control)] border-0 bg-[var(--surface-elevated)] px-3 shadow-[var(--shadow-control)]" disabled={loadingTeachers || teachers.length === 0} onChange={(event) => dispatch({ type: "recipient_selected", value: event.currentTarget.value })} value={recipientKey}>
                <option value="">{loadingTeachers ? "確認中…" : "担当教員を選択"}</option>
                {teachers.map((teacher) => <option disabled={!teacher.canMessage} key={teacher.recipientKey} value={teacher.recipientKey}>{teacher.displayName} — {teacher.roles.join(" / ")}</option>)}
              </select>
            </label>
            <div className="ui-teacher-person grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-[var(--accent-500)] font-bold text-[var(--accent-contrast)]">{selectedTeacher?.displayName.slice(0, 1) ?? "?"}</span><div className="grid min-w-0"><strong className="truncate">{selectedTeacher?.displayName ?? "未選択"}</strong><small className="truncate text-xs text-[var(--text-tertiary)]">{selectedTeacher?.roles.join(" / ") ?? "担当教員を選択"}</small></div></div>
            <div className="ui-teacher-safety grid grid-cols-[auto_minmax(0,1fr)] gap-2 text-[var(--accent-400)]"><ShieldCheck aria-hidden size={20} /><p className="m-0 text-xs leading-5 text-[var(--text-secondary)]">送信直前に受講関係と教員ロールを再確認します。</p></div>
          </Card>
        </aside>
        <Card as="section" className="ui-teacher-compose" padding="spacious" tone="default">
          <header className="mb-6 flex items-start justify-between gap-4"><div><h2 className="m-0 text-lg font-semibold">3. メッセージ</h2><p className="m-0 mt-1 text-sm text-[var(--text-secondary)]">{selectedTeacher?.displayName ?? "担当者を選択"} · {selectedCourse?.name ?? "コースを選択"}</p></div><ChalkboardTeacher aria-hidden className="text-[var(--accent-400)]" size={22} /></header>
          <div className="ui-teacher-compose__body grid gap-5">
            <Field autoComplete="off" id="teacher-message-subject" label="件名" maxLength={200} onChange={(event) => dispatch({ type: "subject_changed", value: event.currentTarget.value })} placeholder="用件を簡潔に入力" value={subject} />
            <Textarea label="本文" maxLength={10_000} onChange={(event) => dispatch({ type: "body_changed", value: event.currentTarget.value })} placeholder="所属・要件・希望する対応を具体的に入力してください" rows={12} value={body} />
            {reviewing ? (
              <Card as="section" className="ui-teacher-review" padding="standard" tone="selected">
                <header className="flex gap-3 text-[var(--accent-400)]"><CheckCircle aria-hidden className="shrink-0" size={20} /><div><h3 className="m-0 text-base text-[var(--text-primary)]" id="teacher-review-title">送信前の確認</h3><p className="m-0 mt-1 text-xs text-[var(--text-secondary)]">この内容でMoodle側の宛先を再検証します。</p></div></header>
                <dl className="m-0 mt-4 grid divide-y divide-[var(--border-subtle)]">{[["宛先", selectedTeacher?.displayName ?? "未選択"], ["コース", selectedCourse?.name ?? "未選択"], ["件名", subject.trim()], ["本文冒頭", `${body.trim().slice(0, 120)}${body.trim().length > 120 ? "…" : ""}`], ["再検証", "受講関係 / 教員ロール / 受信可否"]].map(([label, value]) => <div className="grid min-h-11 grid-cols-[6rem_minmax(0,1fr)] items-center gap-3 py-2 text-sm max-sm:grid-cols-1 max-sm:gap-1" key={label}><dt className="text-xs text-[var(--text-tertiary)]">{label}</dt><dd className="m-0 break-words">{value}</dd></div>)}</dl>
              </Card>
            ) : null}
            {message === "" ? null : <Notice title="送信を完了できませんでした" tone="error" urgent>{message}</Notice>}
          </div>
        </Card>
      </div>}
      header={<RouteHeader actions={<TransitionLink className="ui-app-action-link" href="/messages" intent="return"><ArrowLeft aria-hidden size={18} />会話へ戻る</TransitionLink>} description="受講コースの担当教員へ、Moodleの個別メッセージを送ります。" eyebrow="新規メッセージ" title="先生へ連絡" />}
      mode="focus"
      state={step}
      width="wide"
    />
  );
}
