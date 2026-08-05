import type { ReactNode } from "react";

import { classNames } from "./class-names";

type FormSectionProps = Readonly<{
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  title?: ReactNode;
}>;

export function FormSection({ children, className, description, title }: FormSectionProps) {
  return (
    <section className={classNames("ui-form-section grid min-w-0 gap-5", className)}>
      {title === undefined && description === undefined ? null : (
        <header className="grid gap-1.5">
          {title === undefined ? null : <h2 className="m-0 text-lg font-semibold text-[var(--text-primary)]">{title}</h2>}
          {description === undefined ? null : <p className="m-0 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">{description}</p>}
        </header>
      )}
      <div className="grid min-w-0 gap-5">{children}</div>
    </section>
  );
}

export function FieldGroup({ children, className }: Readonly<{ children: ReactNode; className?: string }>) {
  return <div className={classNames("ui-field-group grid min-w-0 gap-4", className)}>{children}</div>;
}

export function StickyActionBar({ "aria-label": ariaLabel, children, className, role }: Readonly<{ "aria-label"?: string; children: ReactNode; className?: string; role?: string }>) {
  return (
    <div
      className={classNames(
        "ui-sticky-action-bar sticky bottom-[calc(var(--mobile-nav-height,0px)+0.75rem)] z-20 flex min-h-16 flex-wrap items-center justify-end gap-2 rounded-[var(--shape-card)] bg-[color-mix(in_srgb,var(--surface-elevated)_94%,transparent)] p-3 shadow-[var(--shadow-elevated)] backdrop-blur-xl md:bottom-3",
        className,
      )}
      aria-label={ariaLabel}
      role={role}
    >
      {children}
    </div>
  );
}
