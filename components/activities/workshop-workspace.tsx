"use client";

import { FloppyDisk, PencilSimple } from "@phosphor-icons/react";
import ky from "ky";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge, Button, Notice, RichContent } from "@/components/ui";
import { moodleDocumentText } from "@/lib/moodle/html";
import type { WorkshopActivityData } from "@/lib/moodle/activities/workshop-model";

export function WorkshopWorkspace({ cmid, data, locale, timeZone }: Readonly<{
  cmid: number;
  data: WorkshopActivityData;
  locale: string;
  timeZone: string;
}>) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone });

  async function submit(event: React.FormEvent<HTMLFormElement>, submissionId: number | null): Promise<void> {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    const response = await ky.post(`/api/activities/${cmid}/workshop`, {
      json: { content: String(form.get("content") ?? ""), submissionId, title: String(form.get("title") ?? "") },
      retry: 0,
      throwHttpErrors: false,
    });
    setPending(false);
    if (!response.ok) {
      setError("提出を保存できませんでした。入力内容は保持されています。");
      return;
    }
    router.refresh();
  }

  const ownSubmission = data.submissions[0] ?? null;
  const editable = ownSubmission === null ? data.canCreate : data.canModify;
  return (
    <section className="ui-workshop" aria-labelledby="workshop-title">
      <header><div><span className="ui-kicker">Peer workspace</span><h2 id="workshop-title">ワークショップ</h2></div><Badge tone={data.phase.key === "submission" ? "accent" : "neutral"}>{data.phase.label}</Badge></header>
      <RichContent className="ui-rich-content" document={data.instructions} />
      {ownSubmission === null && !editable ? <Notice title="提出は現在受け付けていません" tone="info"><p>フェーズまたは前提タスクを確認してください。</p></Notice> : null}
      {editable ? <form onSubmit={(event) => void submit(event, ownSubmission?.id ?? null)}><label><span>タイトル</span><input defaultValue={ownSubmission?.title ?? ""} maxLength={255} name="title" required /></label><label><span>提出内容</span><textarea defaultValue={ownSubmission === null ? "" : moodleDocumentText(ownSubmission.content)} maxLength={100_000} name="content" rows={12} /></label><footer><span>{ownSubmission === null ? "新規提出" : `更新 ${dateFormat.format(new Date(ownSubmission.timeModified * 1_000))}`}</span><Button disabled={pending} type="submit">{ownSubmission === null ? <FloppyDisk aria-hidden size={17} /> : <PencilSimple aria-hidden size={17} />}{pending ? "保存中" : "提出を保存"}</Button></footer></form> : null}
      <span aria-live="polite" className="ui-form-error">{error}</span>
    </section>
  );
}
