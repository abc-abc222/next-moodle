import type { ReactNode } from "react";

import { classNames } from "./class-names";

type TabsProps = Readonly<{
  children: ReactNode;
  className?: string;
  label: string;
}>;

type TabProps = Readonly<{
  active?: boolean;
  children: ReactNode;
  className?: string;
}>;

export function Tabs({ children, className, label }: TabsProps) {
  return (
    <div
      aria-label={label}
      className={classNames(
        "ui-tabs inline-flex min-h-11 max-w-full items-center gap-1 overflow-x-auto rounded-[var(--shape-control)] bg-[var(--surface-inset)] p-1",
        className,
      )}
      role="tablist"
    >
      {children}
    </div>
  );
}

export function Tab({ active = false, children, className }: TabProps) {
  return (
    <span
      aria-selected={active}
      className={classNames(
        "ui-tab inline-flex min-h-9 shrink-0 items-center justify-center rounded-[calc(var(--shape-control)-0.125rem)] px-3 text-sm font-semibold transition-colors duration-120",
        active
          ? "bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-control)]"
          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
        className,
      )}
      role="tab"
    >
      {children}
    </span>
  );
}
