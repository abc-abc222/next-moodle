"use client";

import { useEffect, useRef } from "react";

export function PdfThumbnail({ bytes, pageIndex }: Readonly<{
  bytes: Uint8Array;
  pageIndex: number;
}>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let disposed = false;
    let cancelRender: (() => void) | undefined;
    let destroyDocument: (() => void) | undefined;
    void import("pdfjs-dist").then(async ({ GlobalWorkerOptions, getDocument }) => {
      GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
      const loadingTask = getDocument({ data: bytes.slice() });
      destroyDocument = () => { void loadingTask.destroy(); };
      const document = await loadingTask.promise;
      if (disposed) return;
      const page = await document.getPage(pageIndex + 1);
      if (disposed) return;
      const canvas = canvasRef.current;
      if (canvas === null) return;
      const viewport = page.getViewport({ scale: 0.26 });
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.ceil(viewport.width * ratio);
      canvas.height = Math.ceil(viewport.height * ratio);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      const context = canvas.getContext("2d");
      if (context === null) return;
      const render = page.render({ canvas, canvasContext: context, transform: [ratio, 0, 0, ratio, 0, 0], viewport });
      cancelRender = () => render.cancel();
      await render.promise.catch(() => undefined);
    }).catch(() => undefined);
    return () => {
      disposed = true;
      cancelRender?.();
      destroyDocument?.();
    };
  }, [bytes, pageIndex]);
  return <canvas aria-label={`PDF ${pageIndex + 1}ページのプレビュー`} className="ui-pdf-thumbnail block h-auto max-w-full rounded-sm shadow-[var(--shadow-control)]" ref={canvasRef} />;
}
