import type { ReactNode } from "react";

import { classNames } from "./class-names";

type EmptyStateProps = Readonly<{
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  icon?: ReactNode;
  title: ReactNode;
}>;

export function EmptyState({ action, children, className, icon, title }: EmptyStateProps) {
  return (
    <div
      className={classNames(
        "ui-empty-state grid min-h-40 place-items-center rounded-[var(--shape-card)] bg-[var(--surface-inset)] p-6 text-center",
        className,
      )}
    >
      <div className="grid max-w-md justify-items-center gap-3">
        {icon === undefined ? null : (
          <span className="grid size-11 place-items-center rounded-full bg-[var(--surface-elevated)] text-[var(--text-secondary)]">
            {icon}
          </span>
        )}
        <strong className="text-base text-[var(--text-primary)]">{title}</strong>
        {children === undefined ? null : (
          <div className="text-sm leading-6 text-[var(--text-secondary)]">{children}</div>
        )}
        {action === undefined ? null : <div className="mt-1">{action}</div>}
      </div>
    </div>
  );
}
