"use client";

import { BookOpenText, Plus } from "@phosphor-icons/react";
import ky from "ky";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Field, Notice, RichContent, Textarea } from "@/components/ui";
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
    const response = await ky.post(`/api/activities/${cmid}/glossary`, {
      json: { concept: form.get("concept"), definition: form.get("definition") },
      retry: 0,
      throwHttpErrors: false,
    });
    setPending(false);
    if (!response.ok) {
      setError(true);
      return;
    }
    formElement.reset();
    router.refresh();
  }

  return (
    <section className="ui-knowledge" aria-labelledby="glossary-title">
      <header><div><span className="ui-kicker">Knowledge base</span><h2 id="glossary-title">用語集</h2></div><span>{data.total}語</span></header>
      {data.entries.length === 0 ? <Notice title="用語はまだ登録されていません" tone="info"><p>登録権限がある場合は、最初の用語を追加できます。</p></Notice> : (
        <dl className="ui-knowledge-list">
          {data.entries.map((entry) => <div key={entry.id}><dt><BookOpenText aria-hidden size={19} /><span>{entry.concept}<small>{entry.author}{entry.approved ? "" : " · 承認待ち"}</small></span></dt><dd><RichContent className="ui-rich-content" document={entry.definition} /></dd></div>)}
        </dl>
      )}
      {data.canAdd ? <details className="ui-knowledge-create"><summary><Plus aria-hidden size={17} />用語を追加</summary><form onSubmit={(event) => void createEntry(event)}><Field id="glossary-concept" label="用語" maxLength={200} name="concept" required /><Textarea id="glossary-definition" label="説明" maxLength={20_000} name="definition" required rows={6} /><Button disabled={pending} type="submit">{pending ? "保存中" : "用語を保存"}</Button><span aria-live="polite" className="ui-form-error">{error ? "保存できませんでした。入力内容は保持されています。" : ""}</span></form></details> : null}
    </section>
  );
}
