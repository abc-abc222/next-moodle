"use client";

import { FloppyDisk, PencilSimple } from "@phosphor-icons/react";
import ky from "ky";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Notice, RichContent, Textarea } from "@/components/ui";
import type { WikiActivityData } from "@/lib/moodle/activities/wiki-model";

export function WikiWorkspace({ cmid, data }: Readonly<{
  cmid: number;
  data: WikiActivityData;
}>) {
  const router = useRouter();
  const [editing, setEditing] = useState<Readonly<{ content: string; pageId: number; version: number }> | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function beginEdit(pageId: number): Promise<void> {
    setPending(true);
    setError(false);
    const response = await ky.get(`/api/activities/${cmid}/wiki`, {
      searchParams: { pageId }, retry: 0, throwHttpErrors: false,
    });
    setPending(false);
    if (!response.ok) {
      setError(true);
      return;
    }
    const body = await response.json<Readonly<{ ok: true; result: { content: string; pageId: number; version: number } }>>();
    setEditing(body.result);
  }

  async function save(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (pending || editing === null) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(false);
    const response = await ky.post(`/api/activities/${cmid}/wiki`, {
      json: { action: "edit", content: form.get("content"), pageId: editing.pageId, version: editing.version },
      retry: 0,
      throwHttpErrors: false,
    });
    setPending(false);
    if (!response.ok) {
      setError(true);
      return;
    }
    setEditing(null);
    router.refresh();
  }

  return (
    <section className="ui-knowledge" aria-labelledby="wiki-title">
      <header><div><span className="ui-kicker">Collaborative document</span><h2 id="wiki-title">Wiki</h2></div><span>{data.pages.length}ページ</span></header>
      {data.pages.length === 0 ? <Notice title="Wikiページはありません" tone="info"><p>最初のページが作成されると、ここへ表示されます。</p></Notice> : (
        <div className="ui-wiki-pages">
          {data.pages.map((page, index) => <article key={page.id}><header><span className="ui-tabular">{String(index + 1).padStart(2, "0")}</span><h3>{page.title}</h3>{page.canEdit ? <button disabled={pending} onClick={() => void beginEdit(page.id)} type="button"><PencilSimple aria-hidden size={16} />編集</button> : null}</header>{editing?.pageId === page.id ? <form onSubmit={(event) => void save(event)}><Textarea defaultValue={editing.content} id={`wiki-content-${page.id}`} label={`${page.title}の本文`} maxLength={100_000} name="content" required rows={14} /><div><Button disabled={pending} type="submit"><FloppyDisk aria-hidden size={17} />{pending ? "保存中" : "保存"}</Button><Button onClick={() => setEditing(null)} type="button" variant="secondary">キャンセル</Button></div></form> : <RichContent className="ui-rich-content" document={page.content} />}</article>)}
        </div>
      )}
      <span aria-live="polite" className="ui-form-error">{error ? "Wikiを更新できませんでした。編集内容は保持されています。" : ""}</span>
    </section>
  );
}
