"use client";

import { CheckCircle } from "@phosphor-icons/react";
import ky from "ky";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, StickyActionBar } from "@/components/ui";
import type { ChoiceActivityData } from "@/lib/moodle/activities/choice";

export function ChoiceWorkspace({ cmid, data }: Readonly<{ cmid: number; data: ChoiceActivityData }>) {
  const router = useRouter();
  const [selected, setSelected] = useState<ReadonlySet<number>>(() => new Set(data.options.filter((option) => option.checked).map((option) => option.id)));
  const [state, setState] = useState<"idle" | "pending" | "success" | "error">("idle");

  function change(id: number, checked: boolean): void {
    setSelected((current) => {
      if (!data.allowMultiple) return checked ? new Set([id]) : new Set();
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (state === "pending" || selected.size === 0) return;
    setState("pending");
    try {
      const response = await ky.post(`/api/activities/${cmid}/choice`, {
        json: { responses: [...selected] }, retry: 0, throwHttpErrors: false,
      });
      setState(response.ok ? "success" : "error");
      if (response.ok) router.refresh();
    } catch {
      setState("error");
    }
  }

  return (
    <form className="ui-choice grid gap-5 rounded-[var(--shape-card)] bg-[var(--surface-primary)] p-4 sm:p-6" onSubmit={(event) => void submit(event)}>
      <header className="flex flex-wrap items-end justify-between gap-4"><div className="grid gap-1"><span className="ui-kicker font-mono text-xs tracking-[.08em] text-[var(--text-tertiary)]">CHOICE</span><h2 className="m-0 text-xl font-semibold">{data.name}</h2></div>{selected.size > 0 ? <span className="text-xs text-[var(--text-tertiary)]">{selected.size}件を選択</span> : null}</header>
      <fieldset className="grid gap-2 border-0 p-0"><legend className="sr-only">選択肢</legend>{data.options.map((option) => <label className="grid min-h-14 cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-[var(--shape-control)] bg-[var(--surface-inset)] px-4 py-3 transition-colors duration-[120ms] has-[:checked]:bg-[var(--surface-selected)] has-[:focus-visible]:shadow-[var(--shadow-focus)] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-55" data-selected={selected.has(option.id)} key={option.id}><input className="size-[1.125rem] accent-[var(--accent-500)]" checked={selected.has(option.id)} disabled={option.disabled || (option.checked && !data.allowUpdate)} name="choice" onChange={(event) => change(option.id, event.currentTarget.checked)} type={data.allowMultiple ? "checkbox" : "radio"} value={option.id} /><span className="flex min-w-0 flex-wrap items-baseline justify-between gap-2"><strong>{option.text}</strong><small className="text-xs text-[var(--text-tertiary)]">{option.countanswers}件の回答</small></span></label>)}</fieldset>
      <StickyActionBar aria-label="回答操作"><span aria-live="polite" className={state === "error" ? "mr-auto text-sm text-[var(--status-error)]" : "mr-auto inline-flex items-center gap-1.5 text-sm text-[var(--status-success)]"}>{state === "success" ? <><CheckCircle aria-hidden size={16} />保存しました</> : state === "error" ? "保存できませんでした。" : ""}</span><Button disabled={state === "pending" || selected.size === 0} loading={state === "pending"} type="submit">{data.options.some((option) => option.checked) ? "回答を更新" : "回答を送信"}</Button></StickyActionBar>
    </form>
  );
}
