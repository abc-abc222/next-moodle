import type { ReactNode } from "react";

import type { SharedTransitionKind, WorkspaceMode } from "@/components/app-shell/motion";
import { SharedTransition } from "@/components/app-shell/transitions";
import { classNames } from "@/components/ui/class-names";

export type PageWidth = "reading" | "standard" | "wide" | "full";

type PageFrameProps = Readonly<{
  actions?: ReactNode;
  className?: string;
  content: ReactNode;
  context?: ReactNode;
  header?: ReactNode;
  mode: WorkspaceMode;
  mobileView?: "content" | "context";
  state?: string;
  utility?: ReactNode;
  width?: PageWidth;
}>;

type RouteHeaderProps = Readonly<{
  actions?: ReactNode;
  breadcrumbs?: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  metadata?: ReactNode;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  shared?: Readonly<{
    identifier: string | number;
    kind: SharedTransitionKind;
  }>;
  status?: ReactNode;
  title: ReactNode;
}>;

type DataRowProps = Readonly<{
  action?: ReactNode;
  index?: ReactNode;
  metadata?: ReactNode;
  state?: ReactNode;
  title: ReactNode;
}>;

type SectionIndexItem = Readonly<{
  href: string;
  id: string | number;
  label: string;
  state?: ReactNode;
}>;

const widthClasses: Record<PageWidth, string> = {
  reading: "max-w-3xl",
  standard: "max-w-6xl",
  wide: "max-w-[90rem]",
  full: "max-w-none",
};

export function PageFrame({ actions, className, content, context, header, mobileView = "content", mode, state, utility, width }: PageFrameProps) {
  const resolvedWidth = width ?? (mode === "focus" ? "reading" : mode === "conversation" ? "full" : "wide");
  return (
    <div className={classNames(
      "ui-page-frame grid min-h-full min-w-0 grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-x-clip bg-[var(--surface-canvas)]",
      mode === "conversation" && "h-full max-h-full overflow-hidden",
      context !== undefined && mode === "conversation" && "md:grid-cols-[18rem_minmax(0,1fr)]",
      context !== undefined && mode === "browse" && "xl:grid-cols-[18rem_minmax(0,1fr)]",
      utility !== undefined && "2xl:grid-cols-[18rem_minmax(0,1fr)_20rem]",
      className,
    )} data-mode={mode} data-state={state} data-width={resolvedWidth}>
      {header === undefined ? null : (
        <div className="ui-page-frame__header col-span-full row-start-1 px-4 pt-5 pb-2 sm:px-6 sm:pt-7 lg:px-10 lg:pt-8">
          <div className={classNames("mx-auto w-full", widthClasses[resolvedWidth])}>{header}</div>
        </div>
      )}
      {context === undefined ? null : (
        <aside className={classNames(
          "ui-page-frame__context row-start-2 hidden min-h-0 w-full min-w-0 bg-[var(--surface-secondary)]",
          mobileView === "context" && "!block col-start-1",
          mode === "conversation" && "md:block md:col-start-1 md:w-[18rem] md:min-w-[18rem]",
          mode === "browse" && "xl:block xl:col-start-1 xl:w-[18rem] xl:min-w-[18rem]",
        )}>{context}</aside>
      )}
      <section className={classNames(
        "ui-page-frame__content row-start-2 min-h-0 w-full min-w-0 px-4 py-5 pb-10 sm:px-6 lg:px-10",
        mobileView === "context" && "max-md:hidden",
        context !== undefined && mode === "conversation" && "md:col-start-2",
        context !== undefined && mode === "browse" && "xl:col-start-2",
        mode === "conversation" && "h-full overflow-hidden !p-0",
      )}>
        <div className={classNames("mx-auto w-full", widthClasses[resolvedWidth], mode === "conversation" && "h-full")}>{content}</div>
      </section>
      {utility === undefined ? null : <aside className="ui-page-frame__utility row-start-2 hidden min-h-0 min-w-0 bg-[var(--surface-secondary)] 2xl:col-start-3 2xl:block">{utility}</aside>}
      {actions === undefined ? null : <footer className="ui-page-frame__actions z-20 col-span-full row-start-3">{actions}</footer>}
    </div>
  );
}

export function RouteHeader({ actions, breadcrumbs, description, eyebrow, metadata, primaryAction, secondaryActions, shared, status, title }: RouteHeaderProps) {
  const heading = <h1 className="m-0 max-w-[26ch] text-[clamp(1.625rem,2.8vw,2.125rem)] leading-[1.08] font-bold tracking-[-.04em] text-[var(--text-primary)] text-balance">{title}</h1>;
  const resolvedEyebrow = breadcrumbs ?? eyebrow;
  const resolvedActions = actions ?? (
    primaryAction === undefined && secondaryActions === undefined ? undefined : (
      <>{secondaryActions}{primaryAction}</>
    )
  );

  return (
    <header className="ui-route-header grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-x-8 gap-y-3 pb-5 max-md:grid-cols-1">
      <div className="ui-route-header__copy row-span-2 grid min-w-0 gap-2">
        {resolvedEyebrow === undefined ? null : <div className="ui-route-header__eyebrow flex flex-wrap items-center gap-2 text-xs font-semibold tracking-[.025em] text-[var(--text-secondary)] [&_a]:text-inherit [&_a]:no-underline">{resolvedEyebrow}</div>}
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          {shared === undefined ? heading : <SharedTransition identifier={shared.identifier} kind={shared.kind}>{heading}</SharedTransition>}
          {status}
        </div>
        {description === undefined ? null : <p className="m-0 max-w-[68ch] text-sm leading-6 text-[var(--text-secondary)] text-pretty">{description}</p>}
      </div>
      {metadata === undefined ? null : <div className="ui-route-header__metadata self-start text-right font-mono text-xs text-[var(--text-tertiary)] max-md:text-left">{metadata}</div>}
      {resolvedActions === undefined ? null : <div className="ui-route-header__actions flex min-w-0 flex-wrap justify-end gap-2 max-md:justify-start">{resolvedActions}</div>}
    </header>
  );
}

export function SectionIndex({ items }: Readonly<{ items: readonly SectionIndexItem[] }>) {
  return (
    <ol className="ui-section-index m-0 list-none p-2">
      {items.map((item, index) => (
        <li key={item.id}>
          <a className="grid min-h-11 grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 rounded-[var(--shape-control)] p-2 text-sm text-[var(--text-secondary)] no-underline transition-colors duration-[120ms] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]" href={item.href}>
            <span className="ui-section-index__number font-mono text-xs text-[var(--accent-400)]">{String(index + 1).padStart(2, "0")}</span>
            <span className="ui-section-index__label min-w-0 truncate">{item.label}</span>
            {item.state === undefined ? null : <span className="ui-section-index__state text-xs text-[var(--text-tertiary)]">{item.state}</span>}
          </a>
        </li>
      ))}
    </ol>
  );
}

export function DataRow({ action, index, metadata, state, title }: DataRowProps) {
  return (
    <div className="ui-data-row grid min-h-15 min-w-0 grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-[var(--border-subtle)] px-3 py-3 transition-colors duration-[120ms] hover:bg-[var(--surface-elevated)] max-sm:grid-cols-[auto_minmax(0,1fr)_auto] max-sm:items-start">
      {index === undefined ? null : <span className="ui-data-row__index font-mono text-xs text-[var(--accent-400)]">{index}</span>}
      <span className="ui-data-row__copy grid min-w-0 gap-0.5"><strong className="truncate">{title}</strong>{metadata === undefined ? null : <small className="truncate text-xs text-[var(--text-tertiary)]">{metadata}</small>}</span>
      {state === undefined ? null : <span className="ui-data-row__state text-xs text-[var(--text-tertiary)] max-sm:col-start-2">{state}</span>}
      {action === undefined ? null : <span className="ui-data-row__action max-sm:col-start-2">{action}</span>}
    </div>
  );
}

export function ActionDock({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="ui-action-dock flex min-h-17 items-center justify-between gap-3 bg-[color-mix(in_srgb,var(--surface-elevated)_94%,transparent)] px-4 py-2 shadow-[0_-12px_32px_rgb(10_8_5_/_8%)] backdrop-blur-xl max-sm:flex-col max-sm:items-stretch max-sm:p-3 sm:px-6 lg:px-8">{children}</div>;
}
