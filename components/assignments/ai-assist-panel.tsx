"use client";

import { ArrowCounterClockwise, Sparkle, StopCircle } from "@phosphor-icons/react";
import { useState } from "react";

import { Button, Notice } from "@/components/ui";
import { AiReviewResponseSchema, type AiReviewResult, type AiTextFormat } from "@/lib/ai/contracts";
import type { AiConsentState } from "./use-ai-consent";

type Props = Readonly<{
  canUndo: boolean;
  cmid: number;
  consentState: AiConsentState;
  format: AiTextFormat;
  onGrant: () => void;
  onInsert: (value: string) => void;
  onRevoke: () => void;
  onUndo: () => void;
  submitting: boolean;
  value: string;
}>;

function errorCopy(code: string): string {
  switch (code) {
    case "access_forbidden": return "アクセスが禁止されています。";
    case "authentication_failed": return "セッションが終了しました。再ログインしてください。";
    case "ai_rate_limited":
    case "ai_provider_rate_limited": return "利用回数の上限です。少し待ってから再試行してください。";
    case "ai_request_in_progress": return "別の補助を処理中です。完了後に再試行してください。";
    case "ai_timeout": return "文章補助が時間内に完了しませんでした。入力は保持されています。";
    case "ai_disabled": return "文章補助は現在利用できません。入力はそのまま続けられます。";
    default: return "文章補助を完了できませんでした。入力を保持したまま再試行できます。";
  }
}

export function AiAssistPanel(props: Props) {
  const [pending, setPending] = useState<"gaps" | "paragraphs" | null>(null);
  const [result, setResult] = useState<AiReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (props.consentState !== "granted") {
    return (
      <aside className="ui-ai-panel" aria-labelledby="ai-consent-title">
        <div className="ui-ai-panel__heading"><Sparkle aria-hidden size={19} /><h3 id="ai-consent-title">文章補助を有効にする</h3></div>
        <p>課題名、課題文、現在の本文から最大6,000文字を、設定されたOpenAI互換APIへ送ります。Moodleの認証情報、添付ファイル、コース一覧は送信しません。</p>
        <p>利用する提供先の保存・学習ポリシーは管理者の設定に従います。内容を確認したうえで、この端末だけで有効にしてください。</p>
        <Button disabled={props.consentState === "loading"} onClick={props.onGrant} type="button" variant="primary">内容を確認して有効化</Button>
      </aside>
    );
  }

  const requestReview = async (intent: "gaps" | "paragraphs") => {
    setPending(intent);
    setError(null);
    try {
      const response = await fetch(`/api/assignments/${props.cmid}/ai/review`, {
        body: JSON.stringify({ excerpt: props.value.slice(0, 6_000), format: props.format, intent }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "x-ai-consent": "1" },
        method: "POST",
      });
      const parsed = AiReviewResponseSchema.safeParse(await response.json());
      if (!parsed.success) {
        setError("ai_unavailable");
      } else if (!parsed.data.ok) {
        setError(parsed.data.error.code);
      } else {
        setResult(parsed.data.result);
      }
    } catch {
      setError("ai_unavailable");
    } finally {
      setPending(null);
    }
  };

  const disabled = props.submitting || props.value.replace(/<[^>]*>/g, "").trim().length < 24;
  return (
    <aside className="ui-ai-panel" aria-labelledby="ai-panel-title">
      <div className="ui-ai-panel__heading">
        <Sparkle aria-hidden size={19} />
        <div><h3 id="ai-panel-title">文章補助</h3><p>提案は確認してから挿入できます。</p></div>
        <button aria-label="文章補助を停止して同意を削除" onClick={props.onRevoke} type="button"><StopCircle aria-hidden size={18} /></button>
      </div>
      <div className="ui-ai-panel__actions">
        <Button disabled={disabled || pending !== null} loading={pending === "gaps"} onClick={() => void requestReview("gaps")} type="button" variant="secondary">不足点を確認</Button>
        <Button disabled={disabled || pending !== null} loading={pending === "paragraphs"} onClick={() => void requestReview("paragraphs")} type="button" variant="secondary">補足案を作る</Button>
      </div>
      {disabled ? <small>24文字以上の本文を入力すると利用できます。</small> : null}
      {error === null ? null : <Notice title="文章補助を完了できません" tone="warning"><p>{errorCopy(error)}</p></Notice>}
      {result === null ? null : (
        <div className="ui-ai-result" aria-live="polite">
          {result.summary === "" ? null : <p>{result.summary}</p>}
          {result.gaps.length === 0 ? null : <ul>{result.gaps.map((gap) => <li key={gap}>{gap}</li>)}</ul>}
          {result.paragraphs.map((paragraph, index) => (
            <article key={`${index}-${paragraph.slice(0, 24)}`}><p>{paragraph}</p><Button onClick={() => props.onInsert(paragraph)} type="button" variant="ghost">この補足案を挿入</Button></article>
          ))}
        </div>
      )}
      {props.canUndo ? <Button icon={<ArrowCounterClockwise aria-hidden size={17} />} onClick={props.onUndo} type="button" variant="ghost">直前の補足挿入を元に戻す</Button> : null}
    </aside>
  );
}
