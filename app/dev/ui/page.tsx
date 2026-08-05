import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ThemeControl } from "@/components/ui";
import { ActionShowcase } from "./action-showcase";
import { FeedbackShowcase } from "./feedback-showcase";
import { FieldShowcase } from "./field-showcase";
import { SubmissionShowcase } from "./submission-showcase";
import { EditorialNativeShowcase } from "./ink-workspace-showcase";

export const metadata: Metadata = {
  title: "静かな学習OS UI — Development",
  description: "Development-only primitive showcase for next-moodle.",
};

export default function DevUiPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[90rem] bg-[var(--surface-canvas)] px-4 py-8 sm:px-6 lg:px-10" data-testid="ui-showcase">
      <header className="grid gap-8 rounded-[var(--shape-sheet)] bg-[var(--surface-primary)] p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="grid max-w-4xl gap-4">
          <span className="font-mono text-xs font-semibold tracking-[.08em] text-[var(--text-tertiary)]">next-moodle / 静かな学習OS</span>
          <h1 className="m-0 text-[clamp(2.25rem,6vw,5rem)] leading-[.98] font-bold tracking-[-.065em]">
            <span className="block">見つける、進める、</span>
            <span className="block">完了する。</span>
          </h1>
          <p className="m-0 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
            学習内容を最優先に、4段階の面、安定した44px操作領域、意味のある状態変化を確認する開発専用カタログです。
          </p>
        </div>
        <div className="grid content-start justify-items-end gap-2">
          <span className="text-xs text-[var(--text-tertiary)]">Live theme</span>
          <ThemeControl />
        </div>
        <dl className="m-0 grid gap-3 rounded-[var(--shape-card)] bg-[var(--surface-inset)] p-4 sm:grid-cols-3 lg:col-span-2">
          <div className="grid gap-1">
            <dt className="text-xs text-[var(--text-tertiary)]">Radii</dt>
            <dd className="ui-tabular m-0 text-sm">10 / 14 / 18</dd>
          </div>
          <div className="grid gap-1">
            <dt className="text-xs text-[var(--text-tertiary)]">Touch</dt>
            <dd className="ui-tabular m-0 text-sm">≥ 44px</dd>
          </div>
          <div className="grid gap-1">
            <dt className="text-xs text-[var(--text-tertiary)]">Motion</dt>
            <dd className="m-0 text-sm">120 / 180 / 200 / 220ms</dd>
          </div>
        </dl>
      </header>

      <EditorialNativeShowcase />
      <ActionShowcase />
      <FieldShowcase />
      <FeedbackShowcase />
      <SubmissionShowcase />

      <footer className="flex flex-wrap justify-between gap-3 py-8 text-xs text-[var(--text-tertiary)]">
        <span>Editorial Native primitives</span>
        <span className="ui-tabular">Next.js 16 · Tailwind CSS 4</span>
      </footer>
    </main>
  );
}
