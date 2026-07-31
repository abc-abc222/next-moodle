"use client";

import { ArrowRight, CheckCircle, Play } from "@phosphor-icons/react";
import ky from "ky";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Notice, RichContent } from "@/components/ui";
import type { LessonActivityData } from "@/lib/moodle/activities/lesson-model";

export function LessonWorkspace({ cmid, data }: Readonly<{
  cmid: number;
  data: LessonActivityData;
}>) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [completed, setCompleted] = useState(data.completed);

  async function mutate(payload: unknown): Promise<Readonly<{ completed: boolean; pageId: number }>|null> {
    setPending(true);
    setError(false);
    const response = await ky.post(`/api/activities/${cmid}/lesson`, { json: payload, retry: 0, throwHttpErrors: false });
    setPending(false);
    if (!response.ok) {
      setError(true);
      return null;
    }
    const body = await response.json<Readonly<{ result: { completed: boolean; pageId: number } }>>();
    return body.result;
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
      setCompleted(true);
      router.refresh();
    } else router.replace(`/activities/${cmid}?lessonPage=${result.pageId}`);
  }

  return (
    <section className="ui-lesson" aria-labelledby="lesson-title">
      <header><div><span className="ui-kicker">Guided learning</span><h2 id="lesson-title">レッスン</h2></div>{data.progress === null ? null : <span>{data.progress}%</span>}</header>
      {data.progress === null ? null : <div aria-label={`進捗 ${data.progress}%`} className="ui-lesson-progress" role="progressbar" aria-valuemax={100} aria-valuemin={0} aria-valuenow={data.progress}><span style={{ inlineSize: `${data.progress}%` }} /></div>}
      {completed ? <Notice title="レッスンを完了しました" tone="success"><p>学習結果はMoodleへ保存されています。</p></Notice> : data.pageId === null ? <div className="ui-feedback-launch"><p>ページを順番に進み、各設問へ回答します。</p><Button disabled={pending} onClick={() => void start()}><Play aria-hidden size={17} />{pending ? "開始中" : "レッスンを開始"}</Button></div> : <form onSubmit={(event) => void answer(event)}><RichContent className="ui-lesson-content ui-rich-content" document={data.content} /><footer><span>{pending ? "保存中" : "回答は次へ進むと保存されます"}</span><Button disabled={pending} type="submit">回答して次へ<ArrowRight aria-hidden size={17} /></Button></footer></form>}
      <span aria-live="polite" className="ui-form-error">{error ? "レッスンを更新できませんでした。回答内容は保持されています。" : ""}</span>
      {completed ? <CheckCircle aria-hidden className="ui-lesson-complete" size={22} weight="fill" /> : null}
    </section>
  );
}
