"use client";

import {
  ArrowDown,
  ArrowUp,
  DownloadSimple,
  FilePdf,
  Plus,
  Selection,
  Trash,
  ArrowClockwise,
} from "@phosphor-icons/react";
import { useRef, useState } from "react";
import * as m from "motion/react-m";
import { useReducedMotion } from "motion/react";

import { Button, Card, EmptyState, IconButton, Notice, StickyActionBar, Toolbar } from "@/components/ui";
import {
  PdfToolError,
  composePdf,
  initialPagePlan,
  preparePdfSources,
  type PdfPagePlan,
  type PdfSource,
} from "@/lib/pdf/operations";
import { PdfThumbnail } from "./pdf-thumbnail";

const ERROR_COPY = {
  broken_pdf: "PDFが破損しているため読み込めません。元ファイルを書き出し直してください。",
  encrypted_pdf: "暗号化されたPDFには対応していません。保護を解除したコピーを使用してください。",
  file_limit: "ファイルは1〜20件で選択してください。",
  memory_error: "端末のメモリが不足しました。ファイルやページを減らしてください。",
  page_limit: "処理できるのは合計150ページまでです。",
  size_limit: "合計容量が100MBを超えています。",
  unsupported_file: "PDF、JPEG、PNG、WebPだけを選択できます。",
} as const;

function download(bytes: Uint8Array, filename: string): void {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const blob = new Blob([buffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function PdfWorkbench() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [sources, setSources] = useState<readonly PdfSource[]>([]);
  const [pages, setPages] = useState<readonly PdfPagePlan[]>([]);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [stripMetadata, setStripMetadata] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  const importFiles = async (files: readonly File[]) => {
    setPending(true); setError(null);
    try {
      const prepared = await preparePdfSources(files);
      const plan = initialPagePlan(prepared);
      setSources(prepared); setPages(plan); setSelected(new Set(plan.map((page) => page.id)));
    } catch (cause) {
      setError(cause instanceof PdfToolError ? ERROR_COPY[cause.code] : ERROR_COPY.memory_error);
    } finally {
      setPending(false);
    }
  };

  const move = (index: number, direction: -1 | 1) => setPages((current) => {
    const target = index + direction;
    if (target < 0 || target >= current.length) return current;
    const next = [...current];
    const item = next[index]; const replacement = next[target];
    if (item === undefined || replacement === undefined) return current;
    next[index] = replacement; next[target] = item; return next;
  });
  const rotate = (id: string) => setPages((current) => current.map((page) => page.id === id
    ? { ...page, rotation: ((page.rotation + 90) % 360) as 0 | 90 | 180 | 270 }
    : page));
  const remove = (id: string) => {
    setPages((current) => current.filter((page) => page.id !== id));
    setSelected((current) => { const next = new Set(current); next.delete(id); return next; });
  };
  const exportPdf = async (onlySelected: boolean) => {
    const outputPages = onlySelected ? pages.filter((page) => selected.has(page.id)) : pages;
    setPending(true); setError(null);
    try {
      download(await composePdf(sources, outputPages, stripMetadata), onlySelected ? "extracted-pages.pdf" : "combined.pdf");
    } catch (cause) {
      setError(cause instanceof PdfToolError ? ERROR_COPY[cause.code] : ERROR_COPY.memory_error);
    } finally { setPending(false); }
  };
  const clear = () => { setSources([]); setPages([]); setSelected(new Set()); setError(null); };

  return (
    <div className="ui-pdf-workbench grid gap-6">
      <Card className="ui-pdf-import grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_auto]" padding="spacious" tone="selected">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1"><FilePdf aria-hidden className="row-span-2 text-[var(--accent-400)]" size={32} weight="regular" /><h2 className="m-0 text-lg font-semibold">端末内だけで処理</h2><p className="m-0 text-sm text-[var(--text-secondary)]">ファイルはNext.jsにもMoodleにも送信されません。</p></div>
        <Button icon={<Plus aria-hidden size={18} />} loading={pending} onClick={() => inputRef.current?.click()} type="button" variant="primary">ファイルを追加</Button>
        <input accept="application/pdf,image/jpeg,image/png,image/webp" aria-label="PDFツールへファイルを追加" className="sr-only" multiple onChange={(event) => { void importFiles([...(event.currentTarget.files ?? [])]); event.currentTarget.value = ""; }} ref={inputRef} type="file" />
        <small className="text-xs text-[var(--text-tertiary)] sm:col-span-2">最大20ファイル · 100MB · 150ページ</small>
      </Card>
      {error === null ? null : <Notice title="処理できませんでした" tone="error"><p>{error}</p></Notice>}
      {pages.length === 0 ? (
        <EmptyState icon={<FilePdf aria-hidden size={24} weight="regular" />} title="PDFか画像を選択"><p>結合、並べ替え、回転、ページ抽出、画像のPDF化ができます。</p></EmptyState>
      ) : (
        <>
          <Toolbar className="ui-pdf-toolbar" label="PDFページ設定">
            <label className="mr-auto flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--shape-control)] px-3 text-sm hover:bg-[var(--surface-elevated)] has-[:focus-visible]:shadow-[var(--shadow-focus)]"><input className="size-[1.125rem] accent-[var(--accent-500)]" checked={stripMetadata} onChange={(event) => setStripMetadata(event.currentTarget.checked)} type="checkbox" /> 標準メタデータを削除</label>
            <span className="text-xs text-[var(--text-tertiary)]">{pages.length}ページ</span>
            <Button onClick={clear} type="button" variant="ghost">キャンセル</Button>
          </Toolbar>
          <ol className="ui-pdf-pages m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-3 p-0">
            {pages.map((page, index) => {
              const source = sources[page.sourceIndex];
              if (source === undefined) return null;
              return (
                <li className="relative grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-[var(--shape-card)] bg-[var(--surface-secondary)] p-3" key={page.id}>
                  <label className="ui-pdf-select absolute top-3 left-3 z-10 grid size-11 cursor-pointer place-items-center rounded-[var(--shape-control)] bg-[var(--surface-elevated)] shadow-[var(--shadow-surface)] has-[:focus-visible]:shadow-[var(--shadow-focus)]"><input className="size-[1.125rem] accent-[var(--accent-500)]" checked={selected.has(page.id)} onChange={() => setSelected((current) => { const next = new Set(current); if (next.has(page.id)) next.delete(page.id); else next.add(page.id); return next; })} type="checkbox" /><span className="sr-only">ページを選択</span></label>
                  <div className="ui-pdf-preview col-span-2 grid min-h-40 overflow-hidden rounded-[var(--shape-control)] bg-[var(--surface-inset)] place-items-center"><m.div animate={{ rotate: page.rotation }} transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.2, 0.75, 0.25, 1] }}><PdfThumbnail bytes={source.bytes} pageIndex={page.pageIndex} /></m.div></div>
                  <div className="ui-pdf-page-copy grid min-w-0"><strong className="truncate text-sm">{source.name}</strong><span className="text-xs text-[var(--text-tertiary)]">{page.pageIndex + 1}ページ</span></div>
                  <div className="ui-pdf-page-actions flex flex-wrap justify-end">
                    <IconButton disabled={index === 0} icon={<ArrowUp aria-hidden size={17} />} label="上へ" onClick={() => move(index, -1)} type="button" />
                    <IconButton disabled={index === pages.length - 1} icon={<ArrowDown aria-hidden size={17} />} label="下へ" onClick={() => move(index, 1)} type="button" />
                    <IconButton icon={<ArrowClockwise aria-hidden size={17} />} label="90度回転" onClick={() => rotate(page.id)} type="button" />
                    <IconButton icon={<Trash aria-hidden size={17} />} label="削除" onClick={() => remove(page.id)} type="button" />
                  </div>
                </li>
              );
            })}
          </ol>
          <StickyActionBar aria-label="PDF出力操作" className="ui-pdf-export">
            <Button disabled={selected.size === 0 || pending} icon={<Selection aria-hidden size={18} />} onClick={() => void exportPdf(true)} type="button" variant="secondary">選択ページを抽出</Button>
            <Button disabled={pending} icon={<DownloadSimple aria-hidden size={18} />} onClick={() => void exportPdf(false)} type="button" variant="primary">PDFをダウンロード</Button>
          </StickyActionBar>
        </>
      )}
    </div>
  );
}
