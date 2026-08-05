"use client";

import { Database, FloppyDisk } from "@phosphor-icons/react";
import ky from "ky";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Card, EmptyState, Notice, RichContent, StickyActionBar } from "@/components/ui";
import { isEmptyMoodleDocument } from "@/lib/moodle/html";
import type { DatabaseActivityData, DatabaseField } from "@/lib/moodle/activities/database-model";

function DatabaseControl({ field }: Readonly<{ field: DatabaseField }>) {
  const shared = { "aria-labelledby": `database-field-label-${field.id}`, id: `database-field-${field.id}`, name: String(field.id), required: field.required };
  const controlClass = "min-h-11 w-full rounded-[var(--shape-control)] border-0 bg-[var(--surface-inset)] px-3 text-sm text-[var(--text-primary)] shadow-[var(--shadow-control)] outline-none focus-visible:shadow-[var(--shadow-focus)]";
  if (field.kind === "unsupported") {
    return <Notice title={`${field.name} は現在入力できません`} tone="warning"><p>この特殊フィールドの型付きパーサーが必要です。入力せずに診断情報を共有してください。</p></Notice>;
  }
  if (field.kind === "textarea") return <textarea {...shared} className={`${controlClass} min-h-36 resize-y p-4 leading-7`} maxLength={50_000} rows={6} />;
  if (field.kind === "select") return <select {...shared} className={controlClass}><option value="">選択してください</option>{field.options.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
  if (field.kind === "checkbox") return <fieldset aria-labelledby={shared["aria-labelledby"]} className="grid gap-2 border-0 p-0">{field.options.map((option) => <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[var(--shape-control)] bg-[var(--surface-inset)] px-3 has-[:focus-visible]:shadow-[var(--shadow-focus)]" key={option}><input className="size-[1.125rem] accent-[var(--accent-500)]" name={shared.name} type="checkbox" value={option} /><span>{option}</span></label>)}</fieldset>;
  return <input {...shared} className={controlClass} maxLength={4_000} type={field.kind === "number" ? "number" : field.kind === "url" ? "url" : "text"} />;
}

export function DatabaseWorkspace({ cmid, data }: Readonly<{
  cmid: number;
  data: DatabaseActivityData;
}>) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (pending) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const values = data.fields.filter((field) => field.kind !== "unsupported").map((field) => ({
      fieldId: field.id,
      value: field.kind === "checkbox" ? form.getAll(String(field.id)).map(String) : String(form.get(String(field.id)) ?? ""),
    }));
    setPending(true);
    setError("");
    try {
      const response = await ky.post(`/api/activities/${cmid}/database`, { json: { values }, retry: 0, throwHttpErrors: false });
      if (!response.ok) {
        setError("レコードを保存できませんでした。入力内容は保持されています。");
        return;
      }
      formElement.reset();
      router.refresh();
    } catch {
      setError("レコードを保存できませんでした。入力内容は保持されています。");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="ui-database grid gap-5" aria-labelledby="database-title">
      <header className="flex flex-wrap items-end justify-between gap-4"><div className="grid gap-1"><span className="ui-kicker font-mono text-xs tracking-[.08em] text-[var(--text-tertiary)]">STRUCTURED RECORDS</span><h2 className="m-0 text-xl font-semibold" id="database-title">データベース</h2></div><span className="text-xs text-[var(--text-tertiary)]">{data.total}件</span></header>
      {isEmptyMoodleDocument(data.entries) ? <EmptyState title="表示できるレコードはありません。" /> : <Card padding="spacious"><RichContent className="ui-database-records" document={data.entries} /></Card>}
      {data.canAdd ? <details className="ui-database-create rounded-[var(--shape-card)] bg-[var(--surface-primary)]"><summary className="flex min-h-14 cursor-pointer items-center gap-2 px-4 font-semibold sm:px-6"><Database aria-hidden size={18} />レコードを追加</summary><form className="grid gap-5 px-4 pt-2 pb-5 sm:px-6" onSubmit={(event) => void submit(event)}>{data.fields.map((field) => <div className="ui-database-field grid gap-2" key={field.id}><span className="text-sm font-semibold" id={`database-field-label-${field.id}`}>{field.name}{field.required ? " *" : ""}</span>{field.description === "" ? null : <small className="text-xs leading-5 text-[var(--text-secondary)]">{field.description}</small>}<DatabaseControl field={field} /></div>)}<span aria-live="polite" className="ui-form-error text-sm text-[var(--status-error)]">{error}</span><StickyActionBar aria-label="データベース操作"><Button disabled={pending} loading={pending} type="submit"><FloppyDisk aria-hidden size={17} />レコードを保存</Button></StickyActionBar></form></details> : <Notice title="追加は現在利用できません" tone="info"><p>閲覧期間または登録上限を確認してください。</p></Notice>}
    </section>
  );
}
