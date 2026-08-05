"use client";

import { FloppyDisk, PencilSimple } from "@phosphor-icons/react";
import ky from "ky";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, EmptyState, RichContent, StickyActionBar, Textarea } from "@/components/ui";
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
    try {
      const response = await ky.get(`/api/activities/${cmid}/wiki`, {
        searchParams: { pageId }, retry: 0, throwHttpErrors: false,
      });
      if (!response.ok) {
        setError(true);
        return;
      }
      const body = await response.json<Readonly<{ ok: true; result: { content: string; pageId: number; version: number } }>>();
      setEditing(body.result);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (pending || editing === null) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(false);
    try {
      const response = await ky.post(`/api/activities/${cmid}/wiki`, {
        json: { action: "edit", content: form.get("content"), pageId: editing.pageId, version: editing.version },
        retry: 0,
        throwHttpErrors: false,
      });
      if (!response.ok) {
        setError(true);
        return;
      }
      setEditing(null);
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="ui-knowledge grid gap-5" aria-labelledby="wiki-title">
      <header className="flex flex-wrap items-end justify-between gap-4"><div className="grid gap-1"><span className="ui-kicker font-mono text-xs tracking-[.08em] text-[var(--text-tertiary)]">COLLABORATIVE DOCUMENT</span><h2 className="m-0 text-xl font-semibold" id="wiki-title">Wiki</h2></div><span className="text-xs text-[var(--text-tertiary)]">{data.pages.length}ページ</span></header>
      {data.pages.length === 0 ? <EmptyState title="Wikiページはありません。"><p>最初のページが作成されると、ここへ表示されます。</p></EmptyState> : (
        <div className="ui-wiki-pages grid divide-y divide-[var(--border-subtle)] rounded-[var(--shape-card)] bg-[var(--surface-primary)] px-4 sm:px-6">
          {data.pages.map((page, index) => <article className="grid gap-4 py-5" key={page.id}><header className="grid min-h-11 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3"><span className="ui-tabular font-mono text-xs text-[var(--text-tertiary)]">{String(index + 1).padStart(2, "0")}</span><h3 className="m-0 text-lg font-semibold">{page.title}</h3>{page.canEdit ? <Button disabled={pending} onClick={() => void beginEdit(page.id)} size="compact" type="button" variant="ghost"><PencilSimple aria-hidden size={16} />編集</Button> : null}</header>{editing?.pageId === page.id ? <form className="grid gap-4" onSubmit={(event) => void save(event)}><Textarea defaultValue={editing.content} id={`wiki-content-${page.id}`} label={`${page.title}の本文`} maxLength={100_000} name="content" required rows={14} /><StickyActionBar aria-label="Wiki編集操作"><Button onClick={() => setEditing(null)} type="button" variant="secondary">キャンセル</Button><Button disabled={pending} loading={pending} type="submit"><FloppyDisk aria-hidden size={17} />保存</Button></StickyActionBar></form> : <RichContent document={page.content} />}</article>)}
        </div>
      )}
      <span aria-live="polite" className="ui-form-error min-h-5 text-sm text-[var(--status-error)]">{error ? "Wikiを更新できませんでした。編集内容は保持されています。" : ""}</span>
    </section>
  );
}
