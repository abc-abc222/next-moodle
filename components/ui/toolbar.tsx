import type { ReactNode } from "react";

import { classNames } from "./class-names";

type ToolbarProps = Readonly<{
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  label: string;
}>;

export function Toolbar({ actions, children, className, label }: ToolbarProps) {
  return (
    <div
      aria-label={label}
      className={classNames(
        "ui-toolbar flex min-h-14 min-w-0 flex-wrap items-center gap-3 rounded-[var(--shape-card)] bg-[var(--surface-elevated)] px-3 py-2 shadow-[var(--shadow-surface)] sm:px-4",
        className,
      )}
      role="toolbar"
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">{children}</div>
      {actions === undefined ? null : (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
