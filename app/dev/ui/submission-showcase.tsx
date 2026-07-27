"use client";

import { useEffect, useState } from "react";
import { PDFDocument } from "pdf-lib";

import { PdfThumbnail } from "@/components/pdf-tools/pdf-thumbnail";
import { SubmissionFileQueue } from "@/components/assignments/submission-file-queue";
import { WritingWorkspace } from "@/components/assignments/writing-workspace";
import { Button, Textarea } from "@/components/ui";
import { ShowcaseSection, ShowcaseSample } from "./showcase-frame";
import styles from "./showcase.module.css";

export function SubmissionShowcase() {
  const [text, setText] = useState("<p>フィールドノートの要約です。</p>");
  const [files, setFiles] = useState<readonly File[]>(() => [
    new File(["fixture"], "observation.txt", { type: "text/plain" }),
  ]);
  const [preview, setPreview] = useState<Uint8Array | null>(null);
  useEffect(() => {
    let active = true;
    void PDFDocument.create().then(async (document) => {
      document.addPage([320, 440]);
      const bytes = await document.save();
      if (active) setPreview(bytes);
    });
    return () => { active = false; };
  }, []);
  return (
    <ShowcaseSection
      description="提出の入力、ファイル保持、進捗、確認、PDFプレビューを一つの文法で確認します。"
      eyebrow="04 / Submission"
      title="Submission primitives"
    >
      <div className={styles.surfaceGrid}>
        <ShowcaseSample label="Textarea">
          <Textarea defaultValue="Markdownやプレーンテキストを形式のまま編集します。" label="本文" />
        </ShowcaseSample>
        <ShowcaseSample label="Rich text" wide>
          <WritingWorkspace
            aiAvailability={{ enabled: true, provider: "OpenAI compatible" }}
            aiConsentStorageKey="next-moodle:ai-consent:showcase"
            cmid={9101}
            disabled={false}
            format={1}
            maxLength={100_000}
            onChange={setText}
            submitting={false}
            value={text}
          />
        </ShowcaseSample>
      </div>
      <SubmissionFileQueue
        accept=".pdf,.txt" disabled={false} existingFiles={[]}
        keptKeys={new Set()} locale="ja-JP" maxFileBytes={10_000_000} maxFiles={5}
        newFiles={files} onAdd={(next) => setFiles((current) => [...current, ...next])}
        onImagesToPdf={() => undefined} onMove={() => undefined}
        onRemoveExisting={() => undefined} onRemoveNew={(index) => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}
      />
      <div className={styles.surfaceGrid}>
        <ShowcaseSample label="Progress"><progress max={100} value={64}>64%</progress></ShowcaseSample>
        <ShowcaseSample label="Confirmation"><p>本文あり · ファイル1件。この内容で提出を確定しますか？</p><Button variant="primary">提出を確定</Button></ShowcaseSample>
        <ShowcaseSample label="PDF thumbnail">{preview === null ? "生成中…" : <PdfThumbnail bytes={preview} pageIndex={0} />}</ShowcaseSample>
      </div>
    </ShowcaseSection>
  );
}
