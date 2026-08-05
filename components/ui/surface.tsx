import type { ReactNode } from "react";
import { classNames } from "./class-names";

export type SurfaceVariant = "base" | "raised" | "inset";

type SurfaceProps = Readonly<{
  actions?: ReactNode;
  children: ReactNode;
  className?: string | undefined;
  eyebrow?: ReactNode;
  title?: ReactNode;
  variant?: SurfaceVariant;
}>;

const variantClasses: Record<SurfaceVariant, string> = {
  base: "bg-[var(--surface-primary)]",
  raised: "bg-[var(--surface-elevated)] shadow-[var(--shadow-surface)]",
  inset: "bg-[var(--surface-inset)]",
};

export function Surface({
  actions,
  children,
  className,
  eyebrow,
  title,
  variant = "base",
}: SurfaceProps) {
  const classes = classNames(
    "ui-surface relative min-w-0 overflow-visible rounded-[var(--shape-card)] p-4 sm:p-5",
    `ui-surface--${variant}`,
    variantClasses[variant],
    className,
  );

  return (
    <section className={classes}>
      {eyebrow || title || actions ? (
        <header className="ui-surface__header mb-4 flex items-start justify-between gap-4 max-sm:flex-col">
          <div className="ui-surface__heading grid min-w-0 gap-1">
            {eyebrow ? <span className="ui-surface__eyebrow text-xs font-semibold text-[var(--text-tertiary)]">{eyebrow}</span> : null}
            {title ? <h3 className="ui-surface__title m-0 text-base font-semibold leading-snug text-[var(--text-primary)]">{title}</h3> : null}
          </div>
          {actions ? <div className="ui-surface__actions shrink-0">{actions}</div> : null}
        </header>
      ) : null}
      <div className="ui-surface__body text-sm leading-6 text-[var(--text-secondary)]">{children}</div>
    </section>
  );
}
