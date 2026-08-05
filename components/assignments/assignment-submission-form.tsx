"use client";

import { CheckCircle, FloppyDisk, PaperPlaneTilt } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

import { Button, Notice, StickyActionBar, Surface } from "@/components/ui";
import type { AiAvailability } from "@/lib/ai/config";
import type { NativeSubmissionPolicy } from "@/lib/moodle/queries/assignment-policy";
import type { AssignmentFile, AssignmentOnlineText } from "@/lib/moodle/queries/assignments";
import { SubmissionFileQueue } from "./submission-file-queue";
import { type WritingTextFormat, WritingWorkspace } from "./writing-workspace";
import {
  APP_MAX_SUBMISSION_BYTES,
  fileIdentity,
  matchesAcceptedType,
  submissionErrorMessage,
} from "./submission-client-policy";

const ResponseSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), result: z.object({ state: z.enum(["draft", "submitted"]) }) }),
  z.object({ ok: z.literal(false), error: z.object({ code: z.string() }) }),
]);

type EnabledPolicy = Extract<NativeSubmissionPolicy, { readonly kind: "enabled" }>;
type Props = Readonly<{
  aiAvailability: AiAvailability;
  aiConsentStorageKey: string;
  cmid: number;
  draftStorageKey: string;
  dueLabel: string;
  existingFiles: readonly AssignmentFile[];
  initialText: AssignmentOnlineText;
  locale: string;
  policy: EnabledPolicy;
}>;

function writingTextFormat(value: number): WritingTextFormat {
  return value === 0 || value === 1 || value === 2 || value === 4 ? value : 2;
}

function allowsText(policy: EnabledPolicy): boolean {
  return policy.mode === "online_text" || policy.mode === "mixed";
}

function allowsFiles(policy: EnabledPolicy): boolean {
  return policy.mode === "files" || policy.mode === "mixed";
}

export function AssignmentSubmissionForm(props: Props) {
  const router = useRouter();
  const [text, setText] = useState(props.initialText.content);
  const [newFiles, setNewFiles] = useState<readonly File[]>([]);
  const [keptKeys, setKeptKeys] = useState<ReadonlySet<string>>(
    () => new Set(props.existingFiles.map((file) => file.key)),
  );
  const [pending, setPending] = useState(false);
  const [converting, setConverting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [statementAccepted, setStatementAccepted] = useState(false);
  const [notice, setNotice] = useState<Readonly<{ tone: "error" | "success"; text: string }> | null>(null);
  const activeFileCount = keptKeys.size + newFiles.length;
  const accept = props.policy.limits.acceptedFileTypes.join(",");
  const keptFileBytes = useMemo(() => props.existingFiles.reduce(
    (total, file) => total + (keptKeys.has(file.key) ? file.filesize : 0),
    0,
  ), [keptKeys, props.existingFiles]);
  const textBytes = new TextEncoder().encode(text).byteLength;
  const queuedBytes = newFiles.reduce((total, file) => total + file.size, keptFileBytes);
  const textTooLarge = textBytes > props.policy.limits.maxOnlineTextBytes;
  const hasText = text.trim() !== "";
  const hasFiles = activeFileCount > 0;
  const submissionReady = props.policy.mode === "online_text"
    ? hasText
    : props.policy.mode === "files"
      ? hasFiles
      : hasText || hasFiles;

  useEffect(() => {
    const saved = window.sessionStorage.getItem(props.draftStorageKey);
    if (saved === null || saved === props.initialText.content) return;
    const task = window.setTimeout(() => setText(saved), 0);
    return () => window.clearTimeout(task);
  }, [props.draftStorageKey, props.initialText.content]);
  useEffect(() => {
    window.sessionStorage.setItem(props.draftStorageKey, text);
  }, [props.draftStorageKey, text]);

  const formatLabel = useMemo(() => {
    if (props.initialText.format === 1) return "HTML";
    if (props.initialText.format === 4) return "Markdown";
    return "プレーンテキスト";
  }, [props.initialText.format]);

  const addFiles = (files: readonly File[]) => {
    const nextCount = activeFileCount + files.length;
    if (nextCount > props.policy.limits.maxFiles) {
      setNotice({ tone: "error", text: submissionErrorMessage("file_count_exceeded") });
      return;
    }
    const identities = new Set(newFiles.map(fileIdentity));
    const duplicate = files.find((file) => identities.has(fileIdentity(file)));
    if (duplicate !== undefined) {
      setNotice({ tone: "error", text: `${duplicate.name}: 同じファイルはすでに追加されています。` });
      return;
    }
    const oversized = files.find((file) => file.size > props.policy.limits.maxFileBytes || file.size === 0);
    if (oversized !== undefined) {
      setNotice({ tone: "error", text: `${oversized.name}: ファイル容量が上限外です。` });
      return;
    }
    const unsupported = files.find((file) => !matchesAcceptedType(file, props.policy.limits.acceptedFileTypes));
    if (unsupported !== undefined) {
      setNotice({ tone: "error", text: `${unsupported.name}: この課題で利用できないファイル形式です。` });
      return;
    }
    if (queuedBytes + files.reduce((total, file) => total + file.size, 0) + textBytes > APP_MAX_SUBMISSION_BYTES) {
      setNotice({ tone: "error", text: "本文とファイルの合計がアプリの12MB上限を超えています。" });
      return;
    }
    setNewFiles((current) => [...current, ...files]);
    setNotice(null);
  };

  const moveFile = (index: number, direction: -1 | 1) => {
    setNewFiles((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const moving = next[index];
      const replaced = next[target];
      if (moving === undefined || replaced === undefined) return current;
      next[index] = replaced;
      next[target] = moving;
      return next;
    });
  };

  const imagesToPdf = async (files: readonly File[]) => {
    setConverting(true); setNotice(null);
    try {
      const { createPdfFromImages } = await import("@/lib/pdf/operations");
      addFiles([await createPdfFromImages(files)]);
    } catch {
      setNotice({ tone: "error", text: "画像をPDFへ変換できませんでした。画像形式と端末の空きメモリを確認してください。" });
    } finally { setConverting(false); }
  };

  const submit = async (intent: "save" | "finalize") => {
    setPending(true);
    setNotice(null);
    const form = new FormData();
    form.set("acceptSubmissionStatement", String(statementAccepted));
    form.set("intent", intent);
    form.set("onlineText", allowsText(props.policy) ? text : "");
    form.set("onlineTextFormat", String(props.initialText.format));
    for (const key of keptKeys) form.append("keptExistingFileKeys", key);
    for (const file of newFiles) form.append("newFiles", file, file.name);
    try {
      const response = await fetch(`/api/assignments/${props.cmid}/submission`, {
        body: form, credentials: "same-origin", method: "POST",
      });
      if (!response.ok) {
        const failed = ResponseSchema.safeParse(await response.json());
        if (!failed.success || failed.data.ok) throw new SyntaxError("Invalid submission error response");
        setNotice({ tone: "error", text: submissionErrorMessage(failed.data.error.code) });
        return;
      }
      const parsed = ResponseSchema.safeParse(await response.json());
      if (!parsed.success) throw new SyntaxError("Invalid submission response");
      if (!parsed.data.ok) {
        setNotice({ tone: "error", text: submissionErrorMessage(parsed.data.error.code) });
        return;
      }
      window.sessionStorage.removeItem(props.draftStorageKey);
      setConfirming(false);
      setNotice({ tone: "success", text: parsed.data.result.state === "submitted" ? "提出を確定しました。" : "下書きをMoodleへ保存しました。" });
      router.refresh();
    } catch (error) {
      if (error instanceof TypeError || error instanceof SyntaxError) {
        setNotice({ tone: "error", text: "Moodleと通信できません。入力を残したまま、再試行できます。" });
      } else throw error;
    } finally {
      setPending(false);
    }
  };

  return (
    <Surface className="ui-assignment-form-surface !p-0" eyebrow="提出ワークスペース" title="提出内容を編集" variant="raised">
      <form className="ui-assignment-form grid gap-6 p-4 sm:p-6" onSubmit={(event) => event.preventDefault()}>
        {props.policy.isGroupSubmission ? <Notice title="グループ提出" tone="info"><p>{props.policy.groupId === 0 ? "Moodleで割り当てられたグループの共同提出として保存します。" : `グループID ${props.policy.groupId} の共同提出として保存します。`}</p></Notice> : null}
        {allowsText(props.policy) ? (
          <section className="ui-assignment-form__text grid gap-4">
            <div className="ui-assignment-form__text-heading flex flex-wrap items-center justify-between gap-3"><h3 className="m-0 text-base font-semibold">オンラインテキスト</h3><span className="text-xs text-[var(--text-tertiary)]">{formatLabel}</span></div>
            <WritingWorkspace
              aiAvailability={props.aiAvailability}
              aiConsentStorageKey={props.aiConsentStorageKey}
              cmid={props.cmid}
              disabled={pending}
              format={writingTextFormat(props.initialText.format)}
              maxLength={props.policy.limits.maxOnlineTextBytes}
              onChange={setText}
              submitting={pending}
              value={text}
            />
            <small className="text-xs text-[var(--text-tertiary)] data-[invalid=true]:text-[var(--status-error)]" data-invalid={textTooLarge}>{textBytes.toLocaleString(props.locale)} / {props.policy.limits.maxOnlineTextBytes.toLocaleString(props.locale)} bytes · 端末内へ自動保存</small>
          </section>
        ) : null}
        {allowsFiles(props.policy) ? (
          <SubmissionFileQueue
            accept={accept} disabled={pending || converting} existingFiles={props.existingFiles}
            keptKeys={keptKeys} locale={props.locale} maxFileBytes={props.policy.limits.maxFileBytes}
            maxFiles={props.policy.limits.maxFiles} newFiles={newFiles} onAdd={addFiles}
            onImagesToPdf={(files) => void imagesToPdf(files)}
            onMove={moveFile} onRemoveExisting={(key) => setKeptKeys((current) => {
              const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next;
            })} onRemoveNew={(index) => setNewFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}
          />
        ) : null}
        {confirming ? (
          <StickyActionBar className="ui-submit-confirmation bg-[var(--surface-selected)]" role="group" aria-label="提出確定の確認">
            <CheckCircle aria-hidden className="shrink-0 text-[var(--accent-400)]" size={26} weight="regular" />
            <div className="mr-auto min-w-0"><h3 className="m-0 text-base font-semibold">この内容で提出を確定しますか？</h3><p className="m-0 mt-1 text-xs text-[var(--text-secondary)]">本文 {text.trim() === "" ? "なし" : "あり"} · ファイル {activeFileCount}件 · 締切 {props.dueLabel}</p></div>
            {props.policy.requiresStatement ? <label className="ui-submit-statement flex min-h-11 basis-full items-center gap-3 text-sm text-[var(--text-primary)]"><input className="size-[18px] accent-[var(--accent-500)]" checked={statementAccepted} onChange={(event) => setStatementAccepted(event.currentTarget.checked)} type="checkbox" /><span>この提出物が自分または所属グループの成果物であることに同意します。</span></label> : null}
            <Button disabled={pending || converting} onClick={() => setConfirming(false)} type="button" variant="ghost">戻る</Button>
            <Button disabled={converting || textTooLarge || !submissionReady || (props.policy.requiresStatement && !statementAccepted)} icon={<PaperPlaneTilt aria-hidden size={18} />} loading={pending} onClick={() => void submit("finalize")} type="button" variant="primary">提出を確定</Button>
          </StickyActionBar>
        ) : (
          <StickyActionBar className="ui-assignment-form__actions">
            <Button disabled={converting || textTooLarge || !submissionReady} icon={<FloppyDisk aria-hidden size={18} />} loading={pending} onClick={() => void submit("save")} type="button" variant="secondary">下書きを保存</Button>
            {props.policy.supportsFinalize ? <Button icon={<PaperPlaneTilt aria-hidden size={18} />} disabled={pending || converting || textTooLarge || !submissionReady} onClick={() => setConfirming(true)} type="button" variant="primary">提出を確定</Button> : null}
          </StickyActionBar>
        )}
      </form>
      {notice === null ? null : <div className="px-4 pb-4 sm:px-6 sm:pb-6"><Notice title={notice.tone === "success" ? "保存しました" : "保存できませんでした"} tone={notice.tone}><p>{notice.text}</p></Notice></div>}
    </Surface>
  );
}
