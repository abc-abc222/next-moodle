import {
  CheckCircle,
  Info,
  Warning,
  XCircle,
} from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";

import { classNames } from "./class-names";

type StatusTone = "neutral" | "info" | "success" | "warning" | "error";

type StatusPanelProps = Readonly<{
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  title: ReactNode;
  tone?: StatusTone;
}>;

const toneClasses: Record<StatusTone, string> = {
  neutral: "bg-[var(--surface-inset)] text-[var(--text-secondary)]",
  info: "bg-[var(--status-info-soft)] text-[var(--status-info)]",
  success: "bg-[var(--status-success-soft)] text-[var(--status-success)]",
  warning: "bg-[var(--status-warning-soft)] text-[var(--status-warning)]",
  error: "bg-[var(--status-error-soft)] text-[var(--status-error)]",
};

function StatusIcon({ tone }: Readonly<{ tone: StatusTone }>) {
  if (tone === "success") return <CheckCircle aria-hidden size={20} />;
  if (tone === "warning") return <Warning aria-hidden size={20} />;
  if (tone === "error") return <XCircle aria-hidden size={20} />;
  return <Info aria-hidden size={20} />;
}

export function StatusPanel({
  action,
  children,
  className,
  title,
  tone = "neutral",
}: StatusPanelProps) {
  return (
    <section
      className={classNames(
        "ui-status-panel grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-[var(--shape-card)] p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto]",
        toneClasses[tone],
        className,
      )}
    >
      <span className="grid size-6 shrink-0 place-items-center"><StatusIcon tone={tone} /></span>
      <div className="min-w-0">
        <strong className="block text-sm text-current">{title}</strong>
        <div className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{children}</div>
      </div>
      {action === undefined ? null : <div className="col-start-2 sm:col-start-3 sm:self-center">{action}</div>}
    </section>
  );
}
