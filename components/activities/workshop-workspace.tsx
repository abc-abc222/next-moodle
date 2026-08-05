"use client";

import { FloppyDisk, PencilSimple } from "@phosphor-icons/react";
import ky from "ky";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Badge, Button, Card, Field, Notice, RichContent, StickyActionBar, Textarea } from "@/components/ui";
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
  const dateFormat = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone }), [locale, timeZone]);

  async function submit(event: React.FormEvent<HTMLFormElement>, submissionId: number | null): Promise<void> {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      const response = await ky.post(`/api/activities/${cmid}/workshop`, {
        json: { content: String(form.get("content") ?? ""), submissionId, title: String(form.get("title") ?? "") },
        retry: 0,
        throwHttpErrors: false,
      });
      if (!response.ok) {
        setError("提出を保存できませんでした。入力内容は保持されています。");
        return;
      }
      router.refresh();
    } catch {
      setError("提出を保存できませんでした。入力内容は保持されています。");
    } finally {
      setPending(false);
    }
  }

  const ownSubmission = data.submissions[0] ?? null;
  const editable = ownSubmission === null ? data.canCreate : data.canModify;
  return (
    <section className="ui-workshop grid gap-5" aria-labelledby="workshop-title">
      <header className="flex flex-wrap items-end justify-between gap-4"><div className="grid gap-1"><span className="ui-kicker font-mono text-xs tracking-[.08em] text-[var(--text-tertiary)]">PEER WORKSPACE</span><h2 className="m-0 text-xl font-semibold" id="workshop-title">ワークショップ</h2></div><Badge tone={data.phase.key === "submission" ? "accent" : "neutral"}>{data.phase.label}</Badge></header>
      <Card padding="spacious"><RichContent document={data.instructions} /></Card>
      {ownSubmission === null && !editable ? <Notice title="提出は現在受け付けていません" tone="info"><p>フェーズまたは前提タスクを確認してください。</p></Notice> : null}
      {editable ? <form className="grid gap-4 rounded-[var(--shape-card)] bg-[var(--surface-primary)] p-4 sm:p-6" onSubmit={(event) => void submit(event, ownSubmission?.id ?? null)}><Field defaultValue={ownSubmission?.title ?? ""} id="workshop-title-input" label="タイトル" maxLength={255} name="title" required /><Textarea defaultValue={ownSubmission === null ? "" : moodleDocumentText(ownSubmission.content)} id="workshop-content" label="提出内容" maxLength={100_000} name="content" rows={12} /><StickyActionBar aria-label="ワークショップ提出操作"><span className="mr-auto text-xs text-[var(--text-tertiary)]">{ownSubmission === null ? "新規提出" : `更新 ${dateFormat.format(new Date(ownSubmission.timeModified * 1_000))}`}</span><Button disabled={pending} loading={pending} type="submit">{ownSubmission === null ? <FloppyDisk aria-hidden size={17} /> : <PencilSimple aria-hidden size={17} />}提出を保存</Button></StickyActionBar></form> : null}
      <span aria-live="polite" className="ui-form-error min-h-5 text-sm text-[var(--status-error)]">{error}</span>
    </section>
  );
}
