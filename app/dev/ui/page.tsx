import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ThemeControl } from "@/components/ui";
import { ActionShowcase } from "./action-showcase";
import { FeedbackShowcase } from "./feedback-showcase";
import { FieldShowcase } from "./field-showcase";
import { SubmissionShowcase } from "./submission-showcase";
import { EditorialNativeShowcase } from "./ink-workspace-showcase";
import styles from "./showcase.module.css";

export const metadata: Metadata = {
  title: "Editorial Native UI — Development",
  description: "Development-only primitive showcase for next-moodle.",
};

export default function DevUiPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <main className={styles.page} data-testid="ui-showcase">
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>next-moodle / Editorial Native</span>
          <h1 className={styles.title}>
            <span className={styles.titleLine}>見つける、進める、</span>
            <span className={styles.titleLine}>完了する。</span>
          </h1>
          <p className={styles.lede}>
            An editorial student workspace with a focus rail, contextual study index, explicit capability
            states, and complete learning interactions. This route exists in development only.
          </p>
        </div>
        <div className={styles.heroControl}>
          <span className={styles.controlLabel}>Live theme</span>
          <ThemeControl />
        </div>
        <dl className={styles.metrics}>
          <div>
            <dt>Radii</dt>
            <dd className="ui-tabular">4 / 8 / 14</dd>
          </div>
          <div>
            <dt>Touch</dt>
            <dd className="ui-tabular">≥ 44px</dd>
          </div>
          <div>
            <dt>Motion</dt>
            <dd>transform + opacity</dd>
          </div>
        </dl>
      </header>

      <EditorialNativeShowcase />
      <ActionShowcase />
      <FieldShowcase />
      <FeedbackShowcase />
      <SubmissionShowcase />

      <footer className={styles.footer}>
        <span>Editorial Native primitives</span>
        <span className="ui-tabular">Next.js 16 · Tailwind CSS 4</span>
      </footer>
    </main>
  );
}
