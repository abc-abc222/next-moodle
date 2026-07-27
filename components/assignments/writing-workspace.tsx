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
    <div className="ui-writing-workspace">
      {props.format === 1 ? (
        <RichTextEditor disabled={props.disabled} initialContent={props.value} onChange={props.onChange} />
      ) : (
        <PlainWritingEditor disabled={props.disabled} maxLength={props.maxLength} onChange={props.onChange} value={props.value} />
      )}
      {props.aiAvailability.enabled ? (
        <details className="ui-writing-utility">
          <summary><Sparkle aria-hidden size={18} /><span>文章補助</span><small>任意</small></summary>
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
