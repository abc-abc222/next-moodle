"use client";

import dynamic from "next/dynamic";
import { Sparkle } from "@phosphor-icons/react";
import { useState } from "react";

import type { AiAvailability } from "@/lib/ai/config";
import { AiAssistPanel } from "./ai-assist-panel";
import { PlainWritingEditor } from "./plain-writing-editor";
import { useAiConsent } from "./use-ai-consent";

const RichTextEditor = dynamic(
  () => import("./rich-text-editor").then((module) => module.RichTextEditor),
  { ssr: false },
);

export type WritingTextFormat = 0 | 1 | 2 | 4;

type WritingWorkspaceProps = Readonly<{
  aiAvailability: AiAvailability;
  aiConsentStorageKey: string;
  cmid: number;
  disabled: boolean;
  format: WritingTextFormat;
  maxLength: number;
  onChange: (value: string) => void;
  submitting: boolean;
  value: string;
}>;

export function WritingWorkspace(props: WritingWorkspaceProps) {
  const consent = useAiConsent(props.aiConsentStorageKey);
  const [previousValue, setPreviousValue] = useState<string | null>(null);
  const insert = (paragraph: string) => {
    setPreviousValue(props.value);
    if (props.format === 1) {
      const escaped = paragraph.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const html = escaped.split(/\n{2,}/).map((line) => `<p>${line.replace(/\n/g, "<br>")}</p>`).join("");
      props.onChange(`${props.value}${html}`);
      return;
    }
    props.onChange(`${props.value.trimEnd()}${props.value.trim() === "" ? "" : "\n\n"}${paragraph}`);
  };
  return (
    <div className="ui-writing-workspace grid items-start gap-4">
      {props.format === 1 ? (
        <RichTextEditor disabled={props.disabled} initialContent={props.value} onChange={props.onChange} />
      ) : (
        <PlainWritingEditor disabled={props.disabled} maxLength={props.maxLength} onChange={props.onChange} value={props.value} />
      )}
      {props.aiAvailability.enabled ? (
        <details className="ui-writing-utility overflow-hidden rounded-[var(--shape-card)] bg-[var(--surface-inset)]">
          <summary className="grid min-h-13 cursor-pointer list-none grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-4 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] [&::-webkit-details-marker]:hidden"><Sparkle aria-hidden className="text-[var(--accent-500)]" size={18} /><span>文章補助</span><small className="text-xs font-normal text-[var(--text-tertiary)]">任意</small></summary>
          <AiAssistPanel
            canUndo={previousValue !== null}
            cmid={props.cmid}
            consentState={consent.state}
            format={props.format}
            onGrant={consent.grant}
            onInsert={insert}
            onRevoke={() => { setPreviousValue(null); consent.revoke(); }}
            onUndo={() => { if (previousValue !== null) props.onChange(previousValue); setPreviousValue(null); }}
            submitting={props.submitting}
            value={props.value}
          />
        </details>
      ) : null}
    </div>
  );
}
