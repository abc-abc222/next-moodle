"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import type { MoodleHtmlNode } from "@/lib/moodle/html";

const RichTextEditor = dynamic(
  () => import("@/components/assignments/rich-text-editor").then((module) => module.RichTextEditor),
  { ssr: false },
);

export function QuizResponseEditor({ node, onChange }: Readonly<{
  node: Extract<MoodleHtmlNode, { kind: "textarea" }>;
  onChange?: (value: string) => void;
}>) {
  const [value, setValue] = useState(node.value);
  const [editorVersion, setEditorVersion] = useState(0);
  const wireRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const wire = wireRef.current;
    if (wire === null) return;
    const handleInput = () => {
      const next = wire.value;
      setValue(next);
      if (next === "") setEditorVersion((current) => current + 1);
      onChange?.(next);
    };
    wire.addEventListener("input", handleInput);
    return () => wire.removeEventListener("input", handleInput);
  }, [onChange]);

  useEffect(() => {
    const wire = wireRef.current;
    if (wire !== null && wire.value !== value) wire.value = value;
  }, [value]);

  const editorId = node.id === undefined ? undefined : `${node.id}-editor`;

  return (
    <div className="ui-quiz-response-editor" data-editor="moodle-response">
      <RichTextEditor
        ariaLabel="回答エディター"
        disabled={node.disabled}
        {...(editorId === undefined ? {} : { editorId })}
        initialContent={value}
        key={editorVersion}
        onChange={(next) => {
          setValue(next);
          onChange?.(next);
        }}
      />
      <textarea
        aria-hidden="true"
        className="ui-quiz-response-editor__wire"
        defaultValue={node.value}
        disabled={node.disabled}
        maxLength={node.maxLength}
        name={node.name}
        ref={wireRef}
        tabIndex={-1}
      />
    </div>
  );
}
