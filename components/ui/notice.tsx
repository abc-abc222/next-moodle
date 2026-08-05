import {
  CheckCircle,
  Info,
  Warning,
  XCircle,
} from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";
import { classNames } from "./class-names";

export type NoticeTone = "info" | "success" | "warning" | "error";

const toneClasses: Record<NoticeTone, string> = {
  info: "bg-[var(--status-info-soft)] text-[var(--status-info)]",
  success: "bg-[var(--status-success-soft)] text-[var(--status-success)]",
  warning: "bg-[var(--status-warning-soft)] text-[var(--status-warning)]",
  error: "bg-[var(--status-error-soft)] text-[var(--status-error)]",
};

type NoticeProps = Readonly<{
  action?: ReactNode;
  children: ReactNode;
  title: ReactNode;
  tone?: NoticeTone;
  urgent?: boolean;
}>;

function NoticeIcon({ tone }: Readonly<{ tone: NoticeTone }>) {
  switch (tone) {
    case "info":
      return <Info aria-hidden size={20} weight="regular" />;
    case "success":
      return <CheckCircle aria-hidden size={20} weight="regular" />;
    case "warning":
      return <Warning aria-hidden size={20} weight="regular" />;
    case "error":
      return <XCircle aria-hidden size={20} weight="regular" />;
  }
}

export function Notice({
  action,
  children,
  title,
  tone = "info",
  urgent = false,
}: NoticeProps) {
  return (
    <div className={classNames(
      `ui-notice ui-notice--${tone}`,
      "grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-[var(--shape-card)] p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto]",
      toneClasses[tone],
    )} role={urgent ? "alert" : "status"}>
      <span className="ui-notice__icon grid size-6 shrink-0 place-items-center">
        <NoticeIcon tone={tone} />
      </span>
      <div className="ui-notice__content grid min-w-0 gap-1">
        <strong className="ui-notice__title text-sm leading-snug text-current">{title}</strong>
        <div className="ui-notice__body text-sm leading-6 text-[var(--text-secondary)]">{children}</div>
      </div>
      {action ? <div className="ui-notice__action col-start-2 self-center sm:col-start-3">{action}</div> : null}
    </div>
  );
}
