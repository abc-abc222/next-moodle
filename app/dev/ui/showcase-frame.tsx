import type { ReactNode } from "react";

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
    <section className="grid gap-6 py-10" id={id}>
      <header className="grid gap-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-8">
        <span className="font-mono text-xs font-semibold tracking-[.08em] text-[var(--text-tertiary)]">{eyebrow}</span>
        <div className="grid gap-2">
          <h2 className="m-0 text-2xl font-semibold tracking-[-.035em]">{title}</h2>
          <p className="m-0 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
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
    <div className={`grid min-w-0 gap-3 rounded-[var(--shape-card)] bg-[var(--surface-primary)] p-4 ${wide ? "md:col-span-2" : ""}`} data-wide={wide}>
      <span className="font-mono text-xs tracking-[.04em] text-[var(--text-tertiary)]">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
