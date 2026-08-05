"use client";

import {
  ArrowDown,
  ArrowUp,
  FileArrowUp,
  FileText,
  Trash,
} from "@phosphor-icons/react";
import { useRef, useState } from "react";

import type { AssignmentFile } from "@/lib/moodle/queries/assignments";
import { numberFormatter } from "@/lib/date-time";

type SubmissionFileQueueProps = Readonly<{
  accept: string;
  disabled: boolean;
  existingFiles: readonly AssignmentFile[];
  keptKeys: ReadonlySet<string>;
  locale: string;
  maxFileBytes: number;
  maxFiles: number;
  newFiles: readonly File[];
  onAdd: (files: readonly File[]) => void;
  onImagesToPdf: (files: readonly File[]) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemoveExisting: (key: string) => void;
  onRemoveNew: (index: number) => void;
}>;

function fileSize(bytes: number, locale: string): string {
  return numberFormatter(locale, { maximumFractionDigits: 1 }).format(bytes / 1_048_576) + " MB";
}

export function SubmissionFileQueue(props: SubmissionFileQueueProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const activeExisting = props.existingFiles.filter((file) => props.keptKeys.has(file.key));
  const totalBytes = activeExisting.reduce((sum, file) => sum + file.filesize, 0)
    + props.newFiles.reduce((sum, file) => sum + file.size, 0);

  return (
    <section className="ui-file-queue grid gap-4" aria-labelledby="submission-files-title">
      <div className="ui-file-queue__heading flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="m-0 text-base font-semibold" id="submission-files-title">提出ファイル</h3><p className="m-0 mt-1 text-xs text-[var(--text-tertiary)]">{activeExisting.length + props.newFiles.length}/{props.maxFiles}件 · {fileSize(totalBytes, props.locale)}</p></div>
        <div className="ui-file-queue__heading-actions flex flex-wrap gap-2">
          <button className="inline-flex min-h-11 items-center gap-2 rounded-[var(--shape-control)] border-0 bg-[var(--surface-elevated)] px-3 text-xs font-semibold text-[var(--text-primary)] shadow-[var(--shadow-control)] disabled:opacity-45" disabled={props.disabled} onClick={() => imageInputRef.current?.click()} type="button">画像をPDF化</button>
          <button className="inline-flex min-h-11 items-center gap-2 rounded-[var(--shape-control)] border-0 bg-[var(--surface-elevated)] px-3 text-xs font-semibold text-[var(--text-primary)] shadow-[var(--shadow-control)] disabled:opacity-45" disabled={props.disabled} onClick={() => inputRef.current?.click()} type="button">
            <FileArrowUp aria-hidden size={18} weight="regular" /> ファイルを選択
          </button>
        </div>
      </div>
      <button
        className="ui-dropzone grid min-h-40 w-full content-center justify-items-center gap-2 rounded-[var(--shape-card)] border border-dashed border-[var(--border-strong)] bg-[var(--surface-inset)] p-4 text-[var(--text-secondary)] transition-colors duration-[120ms] data-[dragging=true]:border-[var(--accent-400)] data-[dragging=true]:bg-[var(--surface-selected)] data-[dragging=true]:text-[var(--accent-400)] disabled:opacity-45"
        data-dragging={dragging}
        disabled={props.disabled}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault(); setDragging(false); props.onAdd([...event.dataTransfer.files]);
        }}
        type="button"
      >
        <FileArrowUp aria-hidden size={25} weight="regular" />
        <span>ここへドラッグ&ドロップ</span>
        <small className="text-xs text-[var(--text-tertiary)]">1ファイル最大{fileSize(props.maxFileBytes, props.locale)}</small>
      </button>
      <input
        accept={props.accept || undefined}
        aria-label="提出ファイルを選択"
        className="ui-sr-only"
        data-testid="submission-file-input"
        disabled={props.disabled}
        multiple
        onChange={(event) => {
          props.onAdd([...(event.currentTarget.files ?? [])]);
          event.currentTarget.value = "";
        }}
        ref={inputRef}
        type="file"
      />
      <input
        accept="image/jpeg,image/png,image/webp"
        aria-label="PDFに変換する画像を選択"
        className="ui-sr-only"
        data-testid="submission-image-input"
        disabled={props.disabled}
        multiple
        onChange={(event) => {
          props.onImagesToPdf([...(event.currentTarget.files ?? [])]);
          event.currentTarget.value = "";
        }}
        ref={imageInputRef}
        type="file"
      />
      {props.existingFiles.length + props.newFiles.length === 0 ? (
        <p className="ui-file-queue__empty m-0 rounded-[var(--shape-control)] bg-[var(--surface-inset)] p-4 text-sm text-[var(--text-tertiary)]">まだファイルはありません。</p>
      ) : (
        <ol className="ui-file-queue__list m-0 grid list-none divide-y divide-[var(--border-subtle)] p-0">
          {props.existingFiles.map((file) => {
            const kept = props.keptKeys.has(file.key);
            return (
              <li className="grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-2 data-[removed=true]:opacity-45" data-removed={!kept} key={file.key}>
                <FileText aria-hidden className="shrink-0 text-[var(--text-secondary)]" size={20} weight="regular" />
                <span className="grid min-w-0"><strong className="truncate">{file.filename}</strong><small className="text-xs text-[var(--text-tertiary)]">保存済み · {fileSize(file.filesize, props.locale)}</small></span>
                <button aria-label={`${file.filename}を${kept ? "除外" : "復元"}`} className="grid min-h-11 min-w-11 place-items-center rounded-[var(--shape-control)] border-0 bg-transparent px-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-inset)]" onClick={() => props.onRemoveExisting(file.key)} type="button">
                  {kept ? <Trash aria-hidden size={18} weight="regular" /> : "復元"}
                </button>
              </li>
            );
          })}
          {props.newFiles.map((file, index) => (
            <li className="grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-2" key={`${file.name}-${file.size}-${file.lastModified}-${file.type}`}>
              <FileText aria-hidden className="shrink-0 text-[var(--text-secondary)]" size={20} weight="regular" />
              <span className="grid min-w-0"><strong className="truncate">{file.name}</strong><small className="text-xs text-[var(--text-tertiary)]">新規 · {fileSize(file.size, props.locale)}</small></span>
              <div className="ui-file-queue__actions flex flex-wrap gap-1">
                <button aria-label={`${file.name}を上へ`} className="grid size-11 place-items-center rounded-[var(--shape-control)] border-0 bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-inset)] disabled:opacity-35" disabled={index === 0} onClick={() => props.onMove(index, -1)} type="button"><ArrowUp aria-hidden size={17} /></button>
                <button aria-label={`${file.name}を下へ`} className="grid size-11 place-items-center rounded-[var(--shape-control)] border-0 bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-inset)] disabled:opacity-35" disabled={index === props.newFiles.length - 1} onClick={() => props.onMove(index, 1)} type="button"><ArrowDown aria-hidden size={17} /></button>
                <button aria-label={`${file.name}を削除`} className="grid size-11 place-items-center rounded-[var(--shape-control)] border-0 bg-transparent text-[var(--status-error)] hover:bg-[var(--status-error-soft)]" onClick={() => props.onRemoveNew(index)} type="button"><Trash aria-hidden size={17} /></button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
