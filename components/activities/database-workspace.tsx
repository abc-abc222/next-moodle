"use client";

import { Database, FloppyDisk } from "@phosphor-icons/react";
import ky from "ky";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Notice, RichContent } from "@/components/ui";
import { isEmptyMoodleDocument } from "@/lib/moodle/html";
import type { DatabaseActivityData, DatabaseField } from "@/lib/moodle/activities/database-model";

function DatabaseControl({ field }: Readonly<{ field: DatabaseField }>) {
  const shared = { "aria-labelledby": `database-field-label-${field.id}`, id: `database-field-${field.id}`, name: String(field.id), required: field.required };
  if (field.kind === "unsupported") {
    return <Notice title={`${field.name} は現在入力できません`} tone="warning"><p>この特殊フィールドの型付きパーサーが必要です。入力せずに診断情報を共有してください。</p></Notice>;
  }
  if (field.kind === "textarea") return <textarea {...shared} maxLength={50_000} rows={6} />;
  if (field.kind === "select") return <select {...shared}><option value="">選択してください</option>{field.options.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
  if (field.kind === "checkbox") return <fieldset aria-labelledby={shared["aria-labelledby"]}>{field.options.map((option) => <label key={option}><input name={shared.name} type="checkbox" value={option} /><span>{option}</span></label>)}</fieldset>;
  return <input {...shared} maxLength={4_000} type={field.kind === "number" ? "number" : field.kind === "url" ? "url" : "text"} />;
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
    const response = await ky.post(`/api/activities/${cmid}/database`, { json: { values }, retry: 0, throwHttpErrors: false });
    setPending(false);
    if (!response.ok) {
      setError("レコードを保存できませんでした。入力内容は保持されています。");
      return;
    }
    formElement.reset();
    router.refresh();
  }

  return (
    <section className="ui-database" aria-labelledby="database-title">
      <header><div><span className="ui-kicker">Structured records</span><h2 id="database-title">データベース</h2></div><span>{data.total}件</span></header>
      {isEmptyMoodleDocument(data.entries) ? <p className="ui-activity-empty">表示できるレコードはありません。</p> : <RichContent className="ui-database-records ui-rich-content" document={data.entries} />}
      {data.canAdd ? <details className="ui-database-create"><summary><Database aria-hidden size={18} />レコードを追加</summary><form onSubmit={(event) => void submit(event)}>{data.fields.map((field) => <div className="ui-database-field" key={field.id}><span id={`database-field-label-${field.id}`}>{field.name}{field.required ? " *" : ""}</span>{field.description === "" ? null : <small>{field.description}</small>}<DatabaseControl field={field} /></div>)}<span aria-live="polite" className="ui-form-error">{error}</span><Button disabled={pending} type="submit"><FloppyDisk aria-hidden size={17} />{pending ? "保存中" : "レコードを保存"}</Button></form></details> : <Notice title="追加は現在利用できません" tone="info"><p>閲覧期間または登録上限を確認してください。</p></Notice>}
    </section>
  );
}
