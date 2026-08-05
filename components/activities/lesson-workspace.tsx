"use client";

import { ArrowRight, CheckCircle, Play } from "@phosphor-icons/react";
import ky from "ky";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Notice, Progress, RichContent, StickyActionBar } from "@/components/ui";
import type { LessonActivityData } from "@/lib/moodle/activities/lesson-model";

export function LessonWorkspace({ cmid, data }: Readonly<{
  cmid: number;
  data: LessonActivityData;
}>) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [completedCmid, setCompletedCmid] = useState<number | null>(null);
  const completed = data.completed || completedCmid === cmid;

  async function mutate(payload: unknown): Promise<Readonly<{ completed: boolean; pageId: number }>|null> {
    setPending(true);
    setError(false);
    try {
      const response = await ky.post(`/api/activities/${cmid}/lesson`, { json: payload, retry: 0, throwHttpErrors: false });
      if (!response.ok) {
        setError(true);
        return null;
      }
      const body = await response.json<Readonly<{ result: { completed: boolean; pageId: number } }>>();
      return body.result;
    } catch {
      setError(true);
      return null;
    } finally {
      setPending(false);
    }
  }

  async function start(): Promise<void> {
    const result = await mutate({ action: "launch" });
    if (result !== null) router.replace(`/activities/${cmid}?lessonPage=${result.pageId}`);
  }

  async function answer(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (data.pageId === null) return;
    const form = new FormData(event.currentTarget);
    const responses = [...form.entries()].filter((entry): entry is [string, string] => typeof entry[1] === "string").map(([name, value]) => ({ name, value }));
    const result = await mutate({ action: "process", pageId: data.pageId, responses });
    if (result === null) return;
    if (result.completed) {
      setCompletedCmid(cmid);
      router.refresh();
    } else router.replace(`/activities/${cmid}?lessonPage=${result.pageId}`);
  }

  return (
    <section className="ui-lesson grid gap-5 rounded-[var(--shape-card)] bg-[var(--surface-primary)] p-4 sm:p-6" aria-labelledby="lesson-title">
      <header className="flex flex-wrap items-end justify-between gap-4"><div className="grid gap-1"><span className="ui-kicker font-mono text-xs tracking-[.08em] text-[var(--text-tertiary)]">GUIDED LEARNING</span><h2 className="m-0 text-xl font-semibold" id="lesson-title">レッスン</h2></div>{data.progress === null ? null : <span className="text-xs text-[var(--text-tertiary)]">{data.progress}%</span>}</header>
      {data.progress === null ? null : <Progress label="レッスンの進捗" value={data.progress} />}
      {completed ? <Notice title="レッスンを完了しました" tone="success"><p>学習結果はMoodleへ保存されています。</p></Notice> : data.pageId === null ? <div className="ui-feedback-launch grid justify-items-start gap-4 rounded-[var(--shape-card)] bg-[var(--surface-inset)] p-5"><p className="m-0 text-sm leading-6 text-[var(--text-secondary)]">ページを順番に進み、各設問へ回答します。</p><Button disabled={pending} loading={pending} onClick={() => void start()}><Play aria-hidden size={17} />レッスンを開始</Button></div> : <form className="grid gap-5" onSubmit={(event) => void answer(event)}><RichContent className="ui-lesson-content" document={data.content} /><StickyActionBar aria-label="レッスン操作"><span className="mr-auto text-xs text-[var(--text-tertiary)]">{pending ? "保存中" : "回答は次へ進むと保存されます"}</span><Button disabled={pending} loading={pending} type="submit">回答して次へ<ArrowRight aria-hidden size={17} /></Button></StickyActionBar></form>}
      <span aria-live="polite" className="ui-form-error min-h-5 text-sm text-[var(--status-error)]">{error ? "レッスンを更新できませんでした。回答内容は保持されています。" : ""}</span>
      {completed ? <CheckCircle aria-hidden className="ui-lesson-complete text-[var(--status-success)]" size={22} weight="fill" /> : null}
    </section>
  );
}
