"use client";

import { ArrowLeft, ArrowRight, CheckCircle, Play } from "@phosphor-icons/react";
import ky from "ky";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Notice, StickyActionBar } from "@/components/ui";
import type { FeedbackActivityData, FeedbackItem } from "@/lib/moodle/activities/feedback-model";

function FeedbackControl({ item }: Readonly<{ item: FeedbackItem }>) {
  const inputClass = "min-h-11 w-full rounded-[var(--shape-control)] border-0 bg-[var(--surface-inset)] px-3 text-sm shadow-[var(--shadow-control)] outline-none focus-visible:shadow-[var(--shadow-focus)]";
  if (item.kind === "display") return <p className="ui-feedback-display m-0 rounded-[var(--shape-control)] bg-[var(--surface-inset)] p-4 text-sm leading-6 text-[var(--text-secondary)]">{item.name}</p>;
  if (item.kind === "unsupported") return <Notice title="未対応の質問形式" tone="warning"><p>{item.name} はMoodle管理者によるアダプターが必要です。</p></Notice>;
  if (item.kind === "textarea") return <label className="grid gap-2"><span className="text-sm font-semibold">{item.name}{item.required ? " *" : ""}</span><textarea className={`${inputClass} min-h-36 resize-y p-4 leading-7`} maxLength={20_000} name={item.responseName} required={item.required} rows={6} /></label>;
  if (item.kind === "text" || item.kind === "number") return <label className="grid gap-2"><span className="text-sm font-semibold">{item.name}{item.required ? " *" : ""}</span><input className={inputClass} maxLength={item.kind === "text" ? 2_000 : undefined} name={item.responseName} required={item.required} type={item.kind === "number" ? "number" : "text"} /></label>;
  return <fieldset className="grid gap-2 border-0 p-0"><legend className="mb-1 text-sm font-semibold">{item.name}{item.required ? " *" : ""}</legend>{item.options.map((option, index) => <label className="flex min-h-13 cursor-pointer items-center gap-3 rounded-[var(--shape-control)] bg-[var(--surface-inset)] px-4 has-[:checked]:bg-[var(--surface-selected)] has-[:focus-visible]:shadow-[var(--shadow-focus)]" key={`${item.id}-${index}`}><input className="size-[1.125rem] accent-[var(--accent-500)]" name={item.responseName} required={item.required && item.kind === "single"} type={item.kind === "multiple" ? "checkbox" : "radio"} value={index + 1} /><span>{option}</span></label>)}</fieldset>;
}

export function FeedbackWorkspace({ cmid, data }: Readonly<{
  cmid: number;
  data: FeedbackActivityData;
}>) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [completed, setCompleted] = useState(false);

  async function start(): Promise<void> {
    setPending(true);
    setError(false);
    try {
      const response = await ky.post(`/api/activities/${cmid}/feedback`, { json: { action: "launch" }, retry: 0, throwHttpErrors: false });
      if (!response.ok) {
        setError(true);
        return;
      }
      const body = await response.json<Readonly<{ result: { completed: boolean; page: number } }>>();
      if (body.result.completed) setCompleted(true);
      else router.replace(`/activities/${cmid}?feedbackPage=${Math.max(0, body.result.page)}`);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (pending || data.page === null) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const previous = submitter instanceof HTMLButtonElement && submitter.value === "previous";
    const form = new FormData(event.currentTarget);
    const responses = data.items.filter((item) => item.kind !== "display" && item.kind !== "unsupported").map((item) => ({
      name: item.responseName,
      value: form.getAll(item.responseName).map(String).join("|"),
    }));
    setPending(true);
    setError(false);
    try {
      const response = await ky.post(`/api/activities/${cmid}/feedback`, {
        json: { action: "process", page: data.page, previous, responses },
        retry: 0,
        throwHttpErrors: false,
      });
      if (!response.ok) {
        setError(true);
        return;
      }
      const body = await response.json<Readonly<{ result: { completed: boolean; page: number } }>>();
      if (body.result.completed) {
        setCompleted(true);
        router.refresh();
      } else {
        router.replace(`/activities/${cmid}?feedbackPage=${Math.max(0, body.result.page)}`);
      }
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="ui-feedback-activity grid gap-5 rounded-[var(--shape-card)] bg-[var(--surface-primary)] p-4 sm:p-6" aria-labelledby="feedback-title">
      <header className="flex flex-wrap items-end justify-between gap-4"><div className="grid gap-1"><span className="ui-kicker font-mono text-xs tracking-[.08em] text-[var(--text-tertiary)]">RESPONSE FORM</span><h2 className="m-0 text-xl font-semibold" id="feedback-title">フィードバック</h2></div>{data.page === null ? null : <span className="text-xs text-[var(--text-tertiary)]">ページ {data.page + 1}</span>}</header>
      {completed ? <Notice title="回答を送信しました" tone="success"><p>回答はMoodleへ保存されました。</p></Notice> : data.page === null ? <div className="ui-feedback-launch grid justify-items-start gap-4 rounded-[var(--shape-card)] bg-[var(--surface-inset)] p-5"><p className="m-0 text-sm leading-6 text-[var(--text-secondary)]">質問を確認して回答を開始します。送信前に内容を確認できます。</p><Button disabled={pending} loading={pending} onClick={() => void start()}><Play aria-hidden size={17} />回答を開始</Button></div> : <form className="grid gap-5" onSubmit={(event) => void submit(event)}>{data.items.map((item) => <FeedbackControl item={item} key={item.id} />)}<StickyActionBar aria-label="フィードバック操作">{data.hasPreviousPage ? <Button disabled={pending} formNoValidate type="submit" value="previous" variant="secondary"><ArrowLeft aria-hidden size={17} />前へ</Button> : null}<Button disabled={pending} loading={pending} type="submit">{data.hasNextPage ? <>次へ<ArrowRight aria-hidden size={17} /></> : <><CheckCircle aria-hidden size={17} />回答を送信</>}</Button></StickyActionBar></form>}
      <span aria-live="polite" className="ui-form-error min-h-5 text-sm text-[var(--status-error)]">{error ? "処理できませんでした。回答内容は保持されています。" : ""}</span>
    </section>
  );
}
