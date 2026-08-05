"use client";

import { CheckCircle, Circle } from "@phosphor-icons/react";
import ky, { isKyError } from "ky";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui";

export function CompletionToggle({ cmid, complete }: Readonly<{ cmid: number; complete: boolean }>) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");

  async function update(): Promise<void> {
    if (status === "pending") return;
    setStatus("pending");
    try {
      const response = await ky.post(`/api/activities/${cmid}/completion`, {
        json: { completed: !complete },
        retry: 0,
        throwHttpErrors: false,
        timeout: 15_000,
      });
      if (!response.ok) {
        setStatus("error");
        return;
      }
    } catch (error) {
      if (!isKyError(error)) throw error;
      setStatus("error");
      return;
    }
    setStatus("idle");
    router.refresh();
  }

  return <div className="ui-completion-toggle grid gap-2"><Button disabled={status === "pending"} loading={status === "pending"} onClick={update} type="button" variant="secondary" icon={complete ? <Circle aria-hidden size={18} /> : <CheckCircle aria-hidden size={18} />}>{complete ? "未完了に戻す" : "完了にする"}</Button><span aria-live="polite" className="min-h-5 text-xs text-[var(--status-error)]">{status === "error" ? "完了状態を更新できませんでした。" : ""}</span></div>;
}
