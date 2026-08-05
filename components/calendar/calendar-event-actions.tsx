"use client";

import { Plus, Trash } from "@phosphor-icons/react";
import ky, { isKyError } from "ky";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, DialogSheet, Field, IconButton } from "@/components/ui";

export function CalendarEventCreator() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (pending) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const startsAt = form.get("startsAt");
    if (typeof startsAt !== "string" || startsAt === "") return;
    setPending(true);
    setError(false);
    try {
      const response = await ky.post("/api/calendar/events", {
        json: { name: form.get("name"), startsAt: new Date(startsAt).toISOString() },
        retry: 0,
        throwHttpErrors: false,
      });
      if (!response.ok) {
        setError(true);
        return;
      }
      formElement.reset();
      setOpen(false);
      router.refresh();
    } catch (cause) {
      if (!isKyError(cause)) throw cause;
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return <><Button icon={<Plus aria-hidden size={17} />} onClick={() => setOpen(true)} variant="secondary">予定を追加</Button><DialogSheet description="個人用の学習予定としてMoodleへ保存します。" label="予定" onOpenChange={setOpen} open={open} placement="center" title="予定を追加"><form className="grid gap-5" onSubmit={submit}><Field id="calendar-event-name" label="予定名" maxLength={200} name="name" required /><Field id="calendar-event-start" label="開始日時" name="startsAt" required type="datetime-local" /><div className="flex justify-end gap-2"><Button onClick={() => setOpen(false)} variant="ghost">キャンセル</Button><Button disabled={pending} loading={pending} type="submit" variant="primary">追加</Button></div><span aria-live="polite" className="text-xs text-[var(--status-error)]">{error ? "予定を追加できませんでした。" : ""}</span></form></DialogSheet></>;
}

export function CalendarEventDelete({ eventId }: Readonly<{ eventId: number }>) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function remove(): Promise<void> {
    if (pending || !window.confirm("この予定を削除しますか？")) return;
    setPending(true);
    try {
      const response = await ky.delete(`/api/calendar/events/${eventId}`, { retry: 0, throwHttpErrors: false });
      if (response.ok) router.refresh();
    } finally {
      setPending(false);
    }
  }
  return <IconButton aria-label="予定を削除" className="ui-calendar-delete" disabled={pending} icon={<Trash aria-hidden size={16} />} label="予定を削除" onClick={remove} variant="ghost" />;
}
