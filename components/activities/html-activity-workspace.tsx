"use client";

import { CheckCircle, ClipboardText, PencilSimple, Warning } from "@phosphor-icons/react";
import ky from "ky";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { Button, Card, EmptyState, Field, FieldGroup, Notice, RichContent, StickyActionBar, Textarea } from "@/components/ui";
import { classNames } from "@/components/ui/class-names";
import { isEmptyMoodleDocument } from "@/lib/moodle/html";
import type { PublicHtmlActivityScreen, QuestionnaireReportItem } from "@/lib/moodle/activities/html-screen-model";
import type { MoodleFormControl, MoodleFormModel, MoodleScreenModel } from "@/lib/moodle/page-model";

type FormValue = string | boolean | readonly string[];
type FormValues = Readonly<Record<string, FormValue>>;

function protectIme(event: KeyboardEvent<HTMLFormElement>): void {
  if (event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault();
}

function initialControlValue(control: MoodleFormControl): FormValue {
  if ("value" in control) return control.value;
  if ("selected" in control) return control.selected;
  return control.checked;
}

function initialValues(form: MoodleFormModel): FormValues {
  return Object.fromEntries(form.controls.map((control) => [control.id, initialControlValue(control)]));
}

function complete(control: MoodleFormControl, value: FormValue | undefined): boolean {
  if (control.kind === "checkbox") return value === true;
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === "string" && value.trim() !== "";
}

function answerLabel(control: MoodleFormControl, value: FormValue | undefined): string {
  if (control.kind === "checkbox") return value === true ? "はい" : "いいえ";
  if (control.kind === "radio" || control.kind === "checkboxes" || control.kind === "select") {
    const selected = Array.isArray(value) ? value : [];
    return selected.map((id) => control.options.find((option) => option.id === id)?.label ?? "").filter(Boolean).join("、");
  }
  return typeof value === "string" ? value : "";
}

function MoodleControl({ control, error, onChange, value }: Readonly<{
  control: MoodleFormControl;
  error: string | undefined;
  onChange: (value: FormValue) => void;
  value: FormValue | undefined;
}>) {
  if (control.kind === "textarea") {
    return <Textarea disabled={control.disabled} id={control.id} label={control.label} {...(control.maxLength === undefined ? {} : { maxLength: control.maxLength })} {...(error === undefined ? {} : { message: error })} onChange={(event) => onChange(event.currentTarget.value)} required={control.required} {...(control.rows === undefined ? {} : { rows: control.rows })} value={typeof value === "string" ? value : ""} />;
  }
  if (control.kind === "text" || control.kind === "email" || control.kind === "number" || control.kind === "date" || control.kind === "datetime" || control.kind === "range") {
    const type = control.kind === "datetime" ? "datetime-local" : control.kind;
    return <Field disabled={control.disabled} id={control.id} label={control.label} {...(control.max === undefined ? {} : { max: control.max })} {...(control.maxLength === undefined ? {} : { maxLength: control.maxLength })} {...(error === undefined ? {} : { message: error })} {...(control.min === undefined ? {} : { min: control.min })} onChange={(event) => onChange(event.currentTarget.value)} {...(control.placeholder === undefined ? {} : { placeholder: control.placeholder })} required={control.required} status={error === undefined ? "default" : "error"} {...(control.step === undefined ? {} : { step: control.step })} type={type} value={typeof value === "string" ? value : ""} />;
  }
  if (control.kind === "checkbox") {
    return <label className="ui-html-form__check flex min-h-14 cursor-pointer items-start gap-3 rounded-[var(--shape-control)] bg-[var(--surface-inset)] p-4 has-[:focus-visible]:shadow-[var(--shadow-focus)] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-55" data-disabled={control.disabled}><input className="mt-0.5 size-[1.125rem] shrink-0 accent-[var(--accent-500)]" checked={value === true} disabled={control.disabled} onChange={(event) => onChange(event.currentTarget.checked)} required={control.required} type="checkbox" /><span className="grid gap-1"><strong>{control.label}</strong>{error === undefined ? null : <small className="text-xs text-[var(--status-error)]" role="alert">{error}</small>}</span></label>;
  }
  if (control.kind !== "radio" && control.kind !== "checkboxes" && control.kind !== "select") return null;
  const selected = new Set(Array.isArray(value) ? value : []);
  if (control.kind === "select") {
    return <label className="ui-html-form__select grid gap-2" htmlFor={control.id}><span className="ui-field__label text-sm font-semibold">{control.label}</span><select className="min-h-11 w-full rounded-[var(--shape-control)] border-0 bg-[var(--surface-inset)] px-3 text-sm shadow-[var(--shadow-control)] outline-none focus-visible:shadow-[var(--shadow-focus)]" disabled={control.disabled} id={control.id} multiple={control.multiple} onChange={(event) => onChange([...event.currentTarget.selectedOptions].map((option) => option.value))} required={control.required} value={[...selected]}>{control.options.map((option) => <option disabled={option.disabled} key={option.id} value={option.id}>{option.label}</option>)}</select>{error === undefined ? null : <small className="text-xs text-[var(--status-error)]" role="alert">{error}</small>}</label>;
  }
  return <fieldset className="ui-html-form__options grid gap-2 border-0 p-0"><legend className="mb-1 text-sm font-semibold">{control.label}{control.required ? <span aria-label="必須"> *</span> : null}</legend>{control.options.map((option) => <label className={classNames("grid min-h-13 cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-[var(--shape-control)] bg-[var(--surface-inset)] px-4 py-3 transition-colors duration-[120ms] has-[:focus-visible]:shadow-[var(--shadow-focus)]", selected.has(option.id) && "bg-[var(--surface-selected)]", (control.disabled || option.disabled) && "cursor-not-allowed opacity-55")} data-selected={selected.has(option.id)} key={option.id}><input className="size-[1.125rem] accent-[var(--accent-500)]" checked={selected.has(option.id)} disabled={control.disabled || option.disabled} name={control.id} onChange={(event) => {
    if (control.kind === "radio") onChange(event.currentTarget.checked ? [option.id] : []);
    else {
      const next = new Set(selected);
      if (event.currentTarget.checked) next.add(option.id); else next.delete(option.id);
      onChange([...next]);
    }
  }} type={control.kind === "radio" ? "radio" : "checkbox"} /><span>{option.label}</span></label>)}{error === undefined ? null : <small className="text-xs text-[var(--status-error)]" role="alert">{error}</small>}</fieldset>;
}

function QuestionnaireReport({ items, submittedAt }: Readonly<{ items: readonly QuestionnaireReportItem[]; submittedAt: string | null }>) {
  return <Card className="ui-html-report grid gap-5" aria-labelledby="questionnaire-report-title" padding="spacious"><header className="flex flex-wrap items-end justify-between gap-3"><div className="grid gap-1"><span className="ui-kicker font-mono text-xs tracking-[.08em] text-[var(--text-tertiary)]">QUESTIONNAIRE</span><h2 className="m-0 text-xl font-semibold" id="questionnaire-report-title">提出した回答</h2></div>{submittedAt === null ? null : <p className="m-0 text-sm text-[var(--text-tertiary)]">{submittedAt}</p>}</header><ol className="m-0 grid list-none divide-y divide-[var(--border-subtle)] p-0">{items.map((item) => <li className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-start gap-3 py-4" key={`${item.number}:${item.prompt}`}><span className="font-mono text-xs text-[var(--text-tertiary)]">{item.number}</span><div className="grid gap-2"><h3 className="m-0 text-sm font-semibold">{item.prompt}</h3>{item.answers.length === 0 ? <p className="ui-questionnaire__unanswered m-0 text-sm text-[var(--text-tertiary)]">回答なし</p> : item.answers.map((answer) => <p className="m-0 text-sm leading-6 text-[var(--text-secondary)]" key={answer}>{answer}</p>)}</div><CheckCircle aria-label="回答済み" className="text-[var(--status-success)]" size={20} weight="fill" /></li>)}</ol></Card>;
}

function AttendanceSummary({ data }: Readonly<{ data: Extract<PublicHtmlActivityScreen, { kind: "attendance" }>["attendance"] }>) {
  const status = data.currentStatus === "present" ? "出席" : data.currentStatus === "late" ? "遅刻" : data.currentStatus === "absent" ? "欠席" : "未確認";
  return <Card className="ui-html-report grid gap-5" aria-labelledby="attendance-summary-title" padding="spacious"><header className="flex flex-wrap items-end justify-between gap-3"><div className="grid gap-1"><span className="ui-kicker font-mono text-xs tracking-[.08em] text-[var(--text-tertiary)]">ATTENDANCE</span><h2 className="m-0 text-xl font-semibold" id="attendance-summary-title">出席状況</h2></div><span className="rounded-full bg-[var(--status-success-soft)] px-3 py-1 text-sm font-semibold text-[var(--status-success)]">{status}</span></header>{data.records.length === 0 ? <EmptyState title="表示できる出席履歴はありません。" /> : <ol className="m-0 grid list-none divide-y divide-[var(--border-subtle)] p-0">{data.records.map((record, index) => <li className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 py-4" key={`${record.date}:${record.status}:${index}`}><span className="font-mono text-xs text-[var(--text-tertiary)]">{index + 1}</span><div><h3 className="m-0 text-sm font-semibold">{record.date}</h3><p className="m-0 mt-1 text-sm text-[var(--text-secondary)]">{record.status}</p></div><CheckCircle aria-hidden className="text-[var(--status-success)]" size={20} /></li>)}</ol>}</Card>;
}

export function MoodleScreenForm({ actionEndpoint, className, form, layout = "default", onPrevious, onScreenChange, presentation = "default" }: Readonly<{
  actionEndpoint: string;
  className?: string;
  form: MoodleFormModel;
  layout?: "compact-action" | "default";
  onPrevious?: () => void;
  onScreenChange: (screen: MoodleScreenModel) => void;
  presentation?: "assignment" | "default" | "forum";
}>) {
  const router = useRouter();
  const statusRef = useRef<HTMLDivElement>(null);
  const inFlightRef = useRef(false);
  const [values, setValues] = useState<FormValues>(() => initialValues(form));
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>(form.errors);
  const [state, setState] = useState<"editing" | "reviewing" | "submitting" | "success" | "error">("editing");
  const [reviewActionId, setReviewActionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const progress = useMemo(() => ({ answered: form.controls.filter((control) => complete(control, values[control.id])).length, total: form.controls.length }), [form.controls, values]);

  useEffect(() => {
    if (!dirty || state === "success") return;
    const warn = (event: BeforeUnloadEvent): void => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, state]);

  function change(id: string, value: FormValue): void {
    setValues((current) => ({ ...current, [id]: value }));
    setDirty(true);
    setErrors((current) => {
      if (current[id] === undefined) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function validate(): Readonly<Record<string, string>> {
    return Object.fromEntries(form.controls.flatMap((control) => control.required && !complete(control, values[control.id]) ? [[control.id, "この項目は必須です。"]] : []));
  }

  async function send(action: MoodleFormModel["actions"][number]): Promise<void> {
    if (inFlightRef.current) return;
    const mustValidate = action.purpose === "next" || action.purpose === "submit";
    const nextErrors = mustValidate ? validate() : {};
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setState("error");
      setMessage(`未入力の必須項目が${Object.keys(nextErrors).length}件あります。`);
      document.getElementById(Object.keys(nextErrors)[0] ?? "")?.focus();
      return;
    }
    inFlightRef.current = true;
    setState("submitting");
    setMessage("Moodleへ送信しています。");
    try {
      const response = await ky.post(actionEndpoint, {
        json: { actionId: action.id, formId: form.id, revision: form.revision, values },
        retry: 0,
        throwHttpErrors: false,
        timeout: 25_000,
      });
      type ActionPayload = Readonly<{ ok?: boolean; result?: Readonly<{ fieldErrors?: Readonly<Record<string, string>>; kind?: string; message?: string; screen?: MoodleScreenModel }> }>;
      const payload: ActionPayload = await response.json<ActionPayload>().catch(() => ({}));
      if (response.ok && payload.ok === true && payload.result?.kind === "success") {
        setDirty(false);
        setState("success");
        setMessage("Moodleへ保存しました。");
        statusRef.current?.focus();
        if (payload.result.screen !== undefined) onScreenChange(payload.result.screen);
        else router.refresh();
        return;
      }
      setErrors(payload.result?.fieldErrors ?? {});
      setState("error");
      setMessage(payload.result?.kind === "reauth_required" ? "Moodleへの再ログインが必要です。" : payload.result?.message ?? "送信できませんでした。入力内容は保持されています。");
      statusRef.current?.focus();
    } catch {
      setState("error");
      setMessage("通信に失敗しました。入力内容は保持されています。");
      statusRef.current?.focus();
    } finally {
      inFlightRef.current = false;
    }
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const primary = form.actions.findLast((action) => action.intent === "primary") ?? form.actions[0];
    if (primary === undefined || state === "submitting") return;
    if (state !== "reviewing" && (primary.purpose === "submit" || primary.purpose === "delete")) {
      const nextErrors = primary.purpose === "submit" ? validate() : {};
      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors); setState("error"); setMessage(`未入力の必須項目が${Object.keys(nextErrors).length}件あります。`); return;
      }
      setState("reviewing");
      setReviewActionId(primary.id);
      setMessage(primary.purpose === "delete" ? "削除すると元に戻せません。内容を確認して確定してください。" : "回答内容を確認して、確定してください。");
      statusRef.current?.focus();
      return;
    }
    void send(primary);
  }

  function beginSecondaryAction(action: MoodleFormModel["actions"][number]): void {
    if (action.purpose === "previous" && onPrevious !== undefined) {
      onPrevious();
      return;
    }
    if (action.purpose === "delete") {
      setReviewActionId(action.id);
      setState("reviewing");
      setMessage("削除すると元に戻せません。内容を確認して確定してください。");
      statusRef.current?.focus();
      return;
    }
    void send(action);
  }

  const reviewAction = reviewActionId === null ? undefined : form.actions.find((action) => action.id === reviewActionId);
  const isNavigationForm = form.controls.length === 0 && form.actions.some((action) => action.purpose === "next");
  const isAssignmentSubmission = presentation === "assignment" && form.title === "入力フォーム";
  const isForumSearch = presentation === "forum" && form.actions.some((action) => action.purpose === "search");
  const heading = isNavigationForm && isAssignmentSubmission ? "提出を開始する" : isAssignmentSubmission ? "提出内容を入力" : isForumSearch && form.title === "入力フォーム" ? "フォーラムを検索" : form.title;
  const statusMessage = message || (isNavigationForm ? presentation === "assignment" ? "入力欄を開きます。保存・提出はまだ行いません。" : "次の画面で提出内容を入力できます。" : isForumSearch ? "キーワードと一致する投稿を検索します。" : "入力内容はMoodleへ直接保存されます。");
  const actionButtons = state === "reviewing"
    ? <><Button onClick={() => { setReviewActionId(null); setState("editing"); }} type="button" variant="secondary">入力へ戻る</Button>{reviewAction === undefined ? null : <Button onClick={() => void send(reviewAction)} type="button" variant={reviewAction.purpose === "delete" ? "danger" : "primary"}>{reviewAction.purpose === "delete" ? "削除を確定" : "この内容で確定"}</Button>}</>
    : form.actions.map((action) => {
      const isPrimary = action.intent === "primary";
      const label = isNavigationForm && presentation === "assignment" && isPrimary ? "提出内容を入力する" : action.label;
      return <Button disabled={state === "submitting"} key={action.id} loading={state === "submitting" && isPrimary} onClick={action.intent === "secondary" ? () => beginSecondaryAction(action) : undefined} type={isPrimary ? "submit" : "button"} variant={action.purpose === "delete" ? "danger" : isPrimary ? "primary" : "secondary"}>{isNavigationForm && isPrimary ? <PencilSimple aria-hidden size={17} /> : null}{label}</Button>;
    });
  if (layout === "compact-action") {
    return <form className={classNames("ui-html-form grid gap-3", className)} noValidate onKeyDown={protectIme} onSubmit={submit}><p aria-live="polite" className={classNames("ui-assignment-html__start-note m-0 flex items-start gap-2 text-sm leading-6", state === "error" ? "text-[var(--status-error)]" : state === "success" ? "text-[var(--status-success)]" : "text-[var(--text-secondary)]")} ref={statusRef} tabIndex={-1}>{state === "error" ? <Warning aria-hidden className="mt-0.5 shrink-0" size={18} /> : state === "success" ? <CheckCircle aria-hidden className="mt-0.5 shrink-0" size={18} /> : <ClipboardText aria-hidden className="mt-0.5 shrink-0" size={18} />}{statusMessage}</p><footer className="flex flex-wrap gap-2">{actionButtons}</footer></form>;
  }
  return <form className={classNames("ui-html-form grid gap-6 rounded-[var(--shape-card)] bg-[var(--surface-primary)] p-4 sm:p-6", className)} noValidate onKeyDown={protectIme} onSubmit={submit}>
    <header className="flex flex-wrap items-end justify-between gap-4"><div className="grid gap-1"><span className="ui-kicker font-mono text-xs tracking-[.08em] text-[var(--text-tertiary)]">{isNavigationForm || isAssignmentSubmission ? "SUBMISSION" : isForumSearch ? "SEARCH" : "FORM"}</span><h2 className="m-0 text-xl font-semibold">{heading}</h2></div><span className="text-xs text-[var(--text-tertiary)]">{isNavigationForm ? "入力前" : `${progress.answered} / ${progress.total} 入力`}</span></header>
    {state === "reviewing" ? <section className="ui-html-form__review grid gap-4 rounded-[var(--shape-card)] bg-[var(--surface-inset)] p-4" aria-label={reviewAction?.purpose === "delete" ? "削除確認" : "回答確認"}><h3 className="m-0 text-base font-semibold">{reviewAction?.purpose === "delete" ? "削除する内容を確認" : "回答内容を確認"}</h3><dl className="m-0 grid divide-y divide-[var(--border-subtle)]">{form.controls.map((control) => <div className="grid gap-1 py-3 sm:grid-cols-[minmax(9rem,.7fr)_minmax(0,1.3fr)] sm:gap-4" key={control.id}><dt className="text-sm font-semibold text-[var(--text-secondary)]">{control.label}</dt><dd className="m-0 text-sm leading-6">{answerLabel(control, values[control.id]) || "未回答"}</dd></div>)}</dl></section> : <FieldGroup className="ui-html-form__controls">{form.controls.map((control) => <MoodleControl control={control} error={errors[control.id]} key={control.id} onChange={(value) => change(control.id, value)} value={values[control.id]} />)}</FieldGroup>}
    <div aria-live="polite" className={classNames("ui-html-form__status flex items-start gap-2 rounded-[var(--shape-control)] bg-[var(--surface-inset)] p-3 text-sm leading-6", state === "error" ? "text-[var(--status-error)]" : state === "success" ? "text-[var(--status-success)]" : "text-[var(--text-secondary)]")} ref={statusRef} tabIndex={-1}>{state === "error" ? <Warning aria-hidden className="mt-0.5 shrink-0" size={18} /> : state === "success" ? <CheckCircle aria-hidden className="mt-0.5 shrink-0" size={18} /> : <ClipboardText aria-hidden className="mt-0.5 shrink-0" size={18} />}{statusMessage}</div>
    <StickyActionBar aria-label="フォーム操作">{actionButtons}</StickyActionBar>
  </form>;
}

export function MoodleScreenWorkspace({ actionEndpoint, kicker, screen, testId = "moodle-screen-workspace" }: Readonly<{
  actionEndpoint: string;
  kicker: string;
  screen: MoodleScreenModel;
  testId?: string;
}>) {
  const [screenOverride, setScreenOverride] = useState<Readonly<{ endpoint: string; screen: MoodleScreenModel }> | null>(null);
  const currentScreen = screenOverride?.endpoint === actionEndpoint ? screenOverride.screen : screen;
  const setCurrentScreen = (nextScreen: MoodleScreenModel): void => setScreenOverride({ endpoint: actionEndpoint, screen: nextScreen });
  return <section className="ui-html-activity grid gap-6" data-testid={testId}>
    <header className="grid gap-1"><span className="ui-kicker font-mono text-xs tracking-[.08em] text-[var(--text-tertiary)]">{kicker.toUpperCase()}</span><h2 className="m-0 text-2xl font-semibold tracking-[-.025em]">{currentScreen.title}</h2></header>
    {currentScreen.state === "closed" ? <Notice title="受付は終了しています" tone="warning"><p>現在の状態と提出済みの内容を確認できます。</p></Notice> : null}
    {currentScreen.notices.map((notice, index) => <Notice key={`${notice.message}:${index}`} title="Moodleからのお知らせ" tone={notice.tone}><p>{notice.message}</p></Notice>)}
    {isEmptyMoodleDocument(currentScreen.document) ? null : <Card padding="spacious"><RichContent document={currentScreen.document} /></Card>}
    {currentScreen.forms.map((form) => <MoodleScreenForm actionEndpoint={actionEndpoint} form={form} key={`${form.id}:${form.revision}`} onScreenChange={setCurrentScreen} />)}
    {currentScreen.forms.length === 0 ? <EmptyState title="現在、操作できる項目はありません。"><p>この画面の最新状態を表示しています。</p></EmptyState> : null}
  </section>;
}

export function HtmlActivityWorkspace({ cmid, data }: Readonly<{ cmid: number; data: PublicHtmlActivityScreen }>) {
  const kicker = data.kind === "questionnaire" ? "Questionnaire" : data.kind === "attendance" ? "Attendance" : data.moduleName;
  return <><MoodleScreenWorkspace actionEndpoint={`/api/activities/${cmid}/html-action`} kicker={kicker} screen={data.screen} testId="html-activity-workspace" />{data.kind === "questionnaire" && data.report.length > 0 ? <QuestionnaireReport items={data.report} submittedAt={data.submittedAt} /> : null}{data.kind === "attendance" ? <AttendanceSummary data={data.attendance} /> : null}</>;
}
