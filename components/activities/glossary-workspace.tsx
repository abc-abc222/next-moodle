"use client";

import { BookOpenText, Plus } from "@phosphor-icons/react";
import ky from "ky";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, EmptyState, Field, RichContent, StickyActionBar, Textarea } from "@/components/ui";
import type { GlossaryActivityData } from "@/lib/moodle/activities/glossary-model";

export function GlossaryWorkspace({ cmid, data }: Readonly<{
  cmid: number;
  data: GlossaryActivityData;
}>) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function createEntry(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (pending) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setPending(true);
    setError(false);
    try {
      const response = await ky.post(`/api/activities/${cmid}/glossary`, {
        json: { concept: form.get("concept"), definition: form.get("definition") },
        retry: 0,
        throwHttpErrors: false,
      });
      if (!response.ok) {
        setError(true);
        return;
      }
      formElement.reset();
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="ui-knowledge grid gap-5" aria-labelledby="glossary-title">
      <header className="flex flex-wrap items-end justify-between gap-4"><div className="grid gap-1"><span className="ui-kicker font-mono text-xs tracking-[.08em] text-[var(--text-tertiary)]">KNOWLEDGE BASE</span><h2 className="m-0 text-xl font-semibold" id="glossary-title">用語集</h2></div><span className="text-xs text-[var(--text-tertiary)]">{data.total}語</span></header>
      {data.entries.length === 0 ? <EmptyState title="用語はまだ登録されていません。"><p>登録権限がある場合は、最初の用語を追加できます。</p></EmptyState> : (
        <dl className="ui-knowledge-list m-0 grid divide-y divide-[var(--border-subtle)] rounded-[var(--shape-card)] bg-[var(--surface-primary)] px-4 sm:px-6">
          {data.entries.map((entry) => <div className="grid gap-4 py-5 sm:grid-cols-[minmax(10rem,.7fr)_minmax(0,1.3fr)] sm:gap-6" key={entry.id}><dt className="flex items-start gap-2 font-semibold"><BookOpenText aria-hidden className="mt-0.5 shrink-0" size={19} /><span className="grid gap-1">{entry.concept}<small className="text-xs font-normal text-[var(--text-tertiary)]">{entry.author}{entry.approved ? "" : " · 承認待ち"}</small></span></dt><dd className="m-0 min-w-0"><RichContent document={entry.definition} /></dd></div>)}
        </dl>
      )}
      {data.canAdd ? <details className="ui-knowledge-create rounded-[var(--shape-card)] bg-[var(--surface-primary)]"><summary className="flex min-h-14 cursor-pointer items-center gap-2 px-4 font-semibold sm:px-6"><Plus aria-hidden size={17} />用語を追加</summary><form className="grid gap-4 px-4 pt-2 pb-5 sm:px-6" onSubmit={(event) => void createEntry(event)}><Field id="glossary-concept" label="用語" maxLength={200} name="concept" required /><Textarea id="glossary-definition" label="説明" maxLength={20_000} name="definition" required rows={6} /><span aria-live="polite" className="ui-form-error min-h-5 text-sm text-[var(--status-error)]">{error ? "保存できませんでした。入力内容は保持されています。" : ""}</span><StickyActionBar aria-label="用語操作"><Button disabled={pending} loading={pending} type="submit">用語を保存</Button></StickyActionBar></form></details> : null}
    </section>
  );
}
