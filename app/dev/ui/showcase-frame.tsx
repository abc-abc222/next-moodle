import type { ReactNode } from "react";
import styles from "./showcase.module.css";

export function ShowcaseSection({
  children,
  description,
  eyebrow,
  id,
  title,
}: Readonly<{
  children: ReactNode;
  description: string;
  eyebrow: string;
  id?: string;
  title: string;
}>) {
  return (
    <section className={styles.section} id={id}>
      <header className={styles.sectionHeader}>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <div>
          <h2 className={styles.sectionTitle}>{title}</h2>
          <p className={styles.sectionDescription}>{description}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

export function ShowcaseSample({
  children,
  label,
  wide = false,
}: Readonly<{ children: ReactNode; label: string; wide?: boolean }>) {
  return (
    <div className={styles.sample} data-wide={wide}>
      <span className={styles.sampleLabel}>{label}</span>
      <div className={styles.sampleContent}>{children}</div>
    </div>
  );
}
