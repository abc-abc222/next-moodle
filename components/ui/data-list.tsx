import type { ReactNode } from "react";

import { classNames } from "./class-names";

type DataListProps = Readonly<{
  children: ReactNode;
  className?: string;
  label?: string;
}>;

type DataListItemProps = Readonly<{
  action?: ReactNode;
  className?: string;
  description?: ReactNode;
  icon?: ReactNode;
  metadata?: ReactNode;
  state?: ReactNode;
  title: ReactNode;
}>;

export function DataList({ children, className, label }: DataListProps) {
  return (
    <div
      aria-label={label}
      className={classNames(
        "ui-data-list min-w-0 divide-y divide-[var(--border-subtle)]",
        className,
      )}
      role={label === undefined ? undefined : "list"}
    >
      {children}
    </div>
  );
}

export function DataListItem({
  action,
  className,
  description,
  icon,
  metadata,
  state,
  title,
}: DataListItemProps) {
  return (
    <div
      className={classNames(
        "ui-data-list-item grid min-h-14 min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3 transition-colors duration-120",
        "hover:bg-[var(--surface-elevated)]",
        className,
      )}
      role="listitem"
    >
      {icon === undefined ? null : (
        <span className="grid size-11 shrink-0 place-items-center rounded-[var(--shape-control)] bg-[var(--surface-inset)] text-[var(--text-secondary)]">
          {icon}
        </span>
      )}
      <span className={classNames("min-w-0", icon === undefined && "col-start-1")}>
        <span className="block truncate font-semibold text-[var(--text-primary)]">{title}</span>
        {description === undefined ? null : (
          <span className="mt-0.5 block text-sm leading-6 text-[var(--text-secondary)]">{description}</span>
        )}
        {metadata === undefined ? null : (
          <span className="mt-1 block text-xs text-[var(--text-tertiary)]">{metadata}</span>
        )}
      </span>
      {state === undefined && action === undefined ? null : (
        <span className="flex shrink-0 items-center gap-2">
          {state}
          {action}
        </span>
      )}
    </div>
  );
}
