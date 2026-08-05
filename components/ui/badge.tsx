import type { ReactNode } from "react";
import { classNames } from "./class-names";

export type BadgeTone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "error"
  | "info";

type BadgeProps = Readonly<{
  children: ReactNode;
  icon?: ReactNode;
  tone?: BadgeTone;
}>;

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-[var(--surface-inset)] text-[var(--text-secondary)]",
  accent: "bg-[var(--accent-soft)] text-[var(--accent-400)]",
  success: "bg-[var(--status-success-soft)] text-[var(--status-success)]",
  warning: "bg-[var(--status-warning-soft)] text-[var(--status-warning)]",
  error: "bg-[var(--status-error-soft)] text-[var(--status-error)]",
  info: "bg-[var(--status-info-soft)] text-[var(--status-info)]",
};

export function Badge({ children, icon, tone = "neutral" }: BadgeProps) {
  return (
    <span className={classNames(
      `ui-badge ui-badge--${tone}`,
      "inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold leading-tight whitespace-nowrap",
      toneClasses[tone],
    )}>
      {icon ? (
        <span aria-hidden className="ui-badge__icon grid shrink-0 place-items-center">
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
    </span>
  );
}
