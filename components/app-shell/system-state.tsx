import {
  ArrowLeft,
  House,
  MagnifyingGlass,
  ShieldWarning,
  WarningOctagon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { ReactNode } from "react";

export type SystemStateKind = "error" | "forbidden" | "not-found";

type SystemStateProps = Readonly<{
  actions?: ReactNode;
  description: ReactNode;
  headingLevel?: 1 | 2;
  kind: SystemStateKind;
  reference?: string;
  title: ReactNode;
}>;

const STATE_META = {
  error: { code: "500", eyebrow: "SYSTEM ERROR", icon: WarningOctagon, tone: "text-[var(--status-error)]" },
  forbidden: { code: "403", eyebrow: "ACCESS CONTROL", icon: ShieldWarning, tone: "text-[var(--status-warning)]" },
  "not-found": { code: "404", eyebrow: "NOT FOUND", icon: MagnifyingGlass, tone: "text-[var(--status-info)]" },
} as const;

export function SystemState({
  actions,
  description,
  headingLevel = 1,
  kind,
  reference,
  title,
}: SystemStateProps) {
  const meta = STATE_META[kind];
  const Icon = meta.icon;
  const Heading = headingLevel === 1 ? "h1" : "h2";

  return (
    <section
      aria-live={kind === "error" ? "assertive" : "polite"}
      className="ui-system-state grid w-full max-w-3xl items-start gap-6 rounded-[var(--shape-sheet)] bg-[var(--surface-primary)] p-5 sm:grid-cols-[minmax(5rem,8rem)_minmax(0,1fr)] sm:gap-8 sm:p-8"
      data-kind={kind}
    >
      <div aria-hidden className={`ui-system-state__code font-mono text-5xl leading-none font-semibold tracking-[-.08em] ${meta.tone}`}>{meta.code}</div>
      <div className="ui-system-state__body grid min-w-0 gap-3">
        <div className={`ui-system-state__eyebrow flex items-center gap-2 font-mono text-xs font-bold tracking-[.08em] ${meta.tone}`}>
          <Icon aria-hidden size={18} weight="regular" />
          <span>{meta.eyebrow}</span>
        </div>
        <Heading className="m-0 max-w-[18ch] text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.05] font-bold tracking-[-.045em] text-balance">{title}</Heading>
        <p className="m-0 max-w-[56ch] text-base leading-7 text-[var(--text-secondary)]">{description}</p>
        {reference === undefined ? null : (
          <p className="ui-system-state__reference m-0 text-xs text-[var(--text-tertiary)]">
            問い合わせ番号 <code>{reference}</code>
          </p>
        )}
        {actions === undefined ? null : (
          <div className="ui-system-state__actions mt-3 flex flex-wrap gap-2">{actions}</div>
        )}
      </div>
    </section>
  );
}

export function DashboardStateLink() {
  return (
    <Link className="ui-system-state__link ui-system-state__link--primary inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--shape-control)] bg-[var(--accent-500)] px-4 text-sm font-semibold text-[var(--accent-contrast)] no-underline transition-colors duration-[120ms] hover:bg-[var(--accent-600)]" href="/dashboard">
      <House aria-hidden size={17} />
      ダッシュボードへ
    </Link>
  );
}

export function BackStateLink() {
  return (
    <Link className="ui-system-state__link inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--shape-control)] bg-[var(--surface-elevated)] px-4 text-sm font-semibold text-[var(--text-primary)] no-underline transition-colors duration-[120ms] hover:bg-[var(--surface-selected)]" href="/courses">
      <ArrowLeft aria-hidden size={17} />
      コース一覧へ
    </Link>
  );
}
