"use client";

import { CheckCircle, ClipboardText, PencilSimple, Warning } from "@phosphor-icons/react";
import ky from "ky";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { Button, Field, Notice, RichContent, Textarea } from "@/components/ui";
import type { PublicHtmlActivityScreen, QuestionnaireReportItem } from "@/lib/moodle/activities/html-screen-model";
import type { MoodleFormControl, MoodleFormModel, MoodleScreenModel } from "@/lib/moodle/page-model";

type FormValue = string | boolean | readonly string[];
type FormValues = Readonly<Record<string, FormValue>>;

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
    return <label className="ui-html-form__check" data-disabled={control.disabled}><input checked={value === true} disabled={control.disabled} onChange={(event) => onChange(event.currentTarget.checked)} required={control.required} type="checkbox" /><span><strong>{control.label}</strong>{error === undefined ? null : <small role="alert">{error}</small>}</span></label>;
  }
  if (control.kind !== "radio" && control.kind !== "checkboxes" && control.kind !== "select") return null;
  const selected = new Set(Array.isArray(value) ? value : []);
  if (control.kind === "select") {
    return <label className="ui-html-form__select" htmlFor={control.id}><span className="ui-field__label">{control.label}</span><select disabled={control.disabled} id={control.id} multiple={control.multiple} onChange={(event) => onChange([...event.currentTarget.selectedOptions].map((option) => option.value))} required={control.required} value={[...selected]}>{control.options.map((option) => <option disabled={option.disabled} key={option.id} value={option.id}>{option.label}</option>)}</select>{error === undefined ? null : <small role="alert">{error}</small>}</label>;
  }
  return <fieldset className="ui-html-form__options"><legend>{control.label}{control.required ? <span aria-label="必須"> *</span> : null}</legend>{control.options.map((option) => <label data-selected={selected.has(option.id)} key={option.id}><input checked={selected.has(option.id)} disabled={control.disabled || option.disabled} name={control.id} onChange={(event) => {
    if (control.kind === "radio") onChange(event.currentTarget.checked ? [option.id] : []);
    else {
      const next = new Set(selected);
      if (event.currentTarget.checked) next.add(option.id); else next.delete(option.id);
      onChange([...next]);
    }
  }} type={control.kind === "radio" ? "radio" : "checkbox"} /><span>{option.label}</span></label>)}{error === undefined ? null : <small role="alert">{error}</small>}</fieldset>;
}

function QuestionnaireReport({ items, submittedAt }: Readonly<{ items: readonly QuestionnaireReportItem[]; submittedAt: string | null }>) {
  return <section className="ui-html-report" aria-labelledby="questionnaire-report-title"><header><div><span className="ui-kicker">Questionnaire</span><h2 id="questionnaire-report-title">提出した回答</h2></div>{submittedAt === null ? null : <p>{submittedAt}</p>}</header><ol>{items.map((item) => <li key={`${item.number}:${item.prompt}`}><span>{item.number}</span><div><h3>{item.prompt}</h3>{item.answers.length === 0 ? <p className="ui-questionnaire__unanswered">回答なし</p> : item.answers.map((answer) => <p key={answer}>{answer}</p>)}</div><CheckCircle aria-label="回答済み" size={20} weight="fill" /></li>)}</ol></section>;
}

function AttendanceSummary({ data }: Readonly<{ data: Extract<PublicHtmlActivityScreen, { kind: "attendance" }>["attendance"] }>) {
  const status = data.currentStatus === "present" ? "出席" : data.currentStatus === "late" ? "遅刻" : data.currentStatus === "absent" ? "欠席" : "未確認";
  return <section className="ui-html-report" aria-labelledby="attendance-summary-title"><header><div><span className="ui-kicker">Attendance</span><h2 id="attendance-summary-title">出席状況</h2></div><p>{status}</p></header>{data.records.length === 0 ? <p>表示できる出席履歴はありません。</p> : <ol>{data.records.map((record, index) => <li key={`${record.date}:${record.status}:${index}`}><span>{index + 1}</span><div><h3>{record.date}</h3><p>{record.status}</p></div><CheckCircle aria-hidden size={20} /></li>)}</ol>}</section>;
}

export function MoodleScreenForm({ actionEndpoint, className, form, layout = "default", onPrevious, onScreenChange, presentation = "default" }: Readonly<{
  actionEndpoint: string;
  className?: string;
  form: MoodleFormModel;
  layout?: "compact-action" | "default";
  onPrevious?: () => void;
  onScreenChange: (screen: MoodleScreenModel) => void;
  presentation?: "assignment" | "default";
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

  function protectIme(event: KeyboardEvent<HTMLFormElement>): void {
    if (event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault();
  }

  const reviewAction = reviewActionId === null ? undefined : form.actions.find((action) => action.id === reviewActionId);
  const isNavigationForm = form.controls.length === 0 && form.actions.some((action) => action.purpose === "next");
  const isAssignmentSubmission = presentation === "assignment" && form.title === "入力フォーム";
  const heading = isNavigationForm && isAssignmentSubmission ? "提出を開始する" : isAssignmentSubmission ? "提出内容を入力" : form.title;
  const statusMessage = message || (isNavigationForm ? presentation === "assignment" ? "入力欄を開きます。保存・提出はまだ行いません。" : "次の画面で提出内容を入力できます。" : "入力内容はMoodleへ直接保存されます。");
  const actionButtons = state === "reviewing"
    ? <><Button onClick={() => { setReviewActionId(null); setState("editing"); }} type="button">戻る</Button>{reviewAction === undefined ? null : <Button onClick={() => void send(reviewAction)} type="button" variant={reviewAction.purpose === "delete" ? "danger" : "primary"}>{reviewAction.purpose === "delete" ? "削除を確定" : "この内容で確定"}</Button>}</>
    : form.actions.map((action) => {
      const isPrimary = action.intent === "primary";
      const label = isNavigationForm && presentation === "assignment" && isPrimary ? "提出内容を入力する" : action.label;
      return <Button disabled={state === "submitting"} key={action.id} loading={state === "submitting" && isPrimary} onClick={action.intent === "secondary" ? () => beginSecondaryAction(action) : undefined} type={isPrimary ? "submit" : "button"} variant={action.purpose === "delete" ? "danger" : isPrimary ? "primary" : "secondary"}>{isNavigationForm && isPrimary ? <PencilSimple aria-hidden size={17} /> : null}{label}</Button>;
    });
  if (layout === "compact-action") {
    return <form className={["ui-html-form", className].filter(Boolean).join(" ")} noValidate onKeyDown={protectIme} onSubmit={submit}><p aria-live="polite" className="ui-assignment-html__start-note" ref={statusRef} tabIndex={-1}>{state === "error" ? <Warning aria-hidden size={18} /> : state === "success" ? <CheckCircle aria-hidden size={18} /> : <ClipboardText aria-hidden size={18} />}{statusMessage}</p><footer>{actionButtons}</footer></form>;
  }
  return <form className={["ui-html-form", className].filter(Boolean).join(" ")} noValidate onKeyDown={protectIme} onSubmit={submit}><header><div><span className="ui-kicker">{isNavigationForm || isAssignmentSubmission ? "Submission" : "Form"}</span><h2>{heading}</h2></div><span>{isNavigationForm ? "入力前" : `${progress.answered} / ${progress.total} 入力`}</span></header>{state === "reviewing" ? <section className="ui-html-form__review" aria-label={reviewAction?.purpose === "delete" ? "削除確認" : "回答確認"}><h3>{reviewAction?.purpose === "delete" ? "削除する内容を確認" : "回答内容を確認"}</h3><dl>{form.controls.map((control) => <div key={control.id}><dt>{control.label}</dt><dd>{answerLabel(control, values[control.id]) || "未回答"}</dd></div>)}</dl></section> : <div className="ui-html-form__controls">{form.controls.map((control) => <MoodleControl control={control} error={errors[control.id]} key={control.id} onChange={(value) => change(control.id, value)} value={values[control.id]} />)}</div>}<div aria-live="polite" className="ui-html-form__status" ref={statusRef} tabIndex={-1}>{state === "error" ? <Warning aria-hidden size={18} /> : state === "success" ? <CheckCircle aria-hidden size={18} /> : <ClipboardText aria-hidden size={18} />}{statusMessage}</div><footer>{actionButtons}</footer></form>;
}

export function MoodleScreenWorkspace({ actionEndpoint, kicker, screen, testId = "moodle-screen-workspace" }: Readonly<{
  actionEndpoint: string;
  kicker: string;
  screen: MoodleScreenModel;
  testId?: string;
}>) {
  const [currentScreen, setCurrentScreen] = useState(screen);
  return <section className="ui-html-activity" data-testid={testId}><header><span className="ui-kicker">{kicker}</span><h2>{currentScreen.title}</h2></header>{currentScreen.state === "closed" ? <Notice title="受付は終了しています" tone="warning"><p>現在の状態と提出済みの内容を確認できます。</p></Notice> : null}{currentScreen.notices.map((notice, index) => <Notice key={`${notice.message}:${index}`} title="Moodleからのお知らせ" tone={notice.tone}><p>{notice.message}</p></Notice>)}<RichContent className="ui-rich-content" document={currentScreen.document} />{currentScreen.forms.map((form) => <MoodleScreenForm actionEndpoint={actionEndpoint} form={form} key={`${form.id}:${form.revision}`} onScreenChange={setCurrentScreen} />)}{currentScreen.forms.length === 0 ? <Notice title="操作できる項目はありません" tone="info"><p>この画面の現在の状態を表示しています。</p></Notice> : null}</section>;
}

export function HtmlActivityWorkspace({ cmid, data }: Readonly<{ cmid: number; data: PublicHtmlActivityScreen }>) {
  const kicker = data.kind === "questionnaire" ? "Questionnaire" : data.kind === "attendance" ? "Attendance" : data.moduleName;
  return <><MoodleScreenWorkspace actionEndpoint={`/api/activities/${cmid}/html-action`} kicker={kicker} screen={data.screen} testId="html-activity-workspace" />{data.kind === "questionnaire" && data.report.length > 0 ? <QuestionnaireReport items={data.report} submittedAt={data.submittedAt} /> : null}{data.kind === "attendance" ? <AttendanceSummary data={data.attendance} /> : null}</>;
}
