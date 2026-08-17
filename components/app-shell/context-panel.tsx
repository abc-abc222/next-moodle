"use client";

import { CaretLeft } from "@phosphor-icons/react";
import { useCallback, useEffect, useSyncExternalStore, type ReactNode } from "react";

import { contextPanelStorageKey, peekContextPanelPreference, readContextPanelPreference, writeContextPanelPreference } from "./layout-preferences";
import { classNames } from "@/components/ui/class-names";

type ContextPanelProps = Readonly<{
  children: ReactNode;
  count?: ReactNode;
  mobileAlwaysOpen?: boolean;
  storageKey: "course" | "messages" | "student";
  title: ReactNode;
}>;

const STORAGE_EVENT = "next-moodle-context-layout";

export function ContextPanel({ children, count, mobileAlwaysOpen = false, storageKey, title }: ContextPanelProps) {
  const subscribe = useCallback((onStoreChange: () => void) => {
    window.addEventListener("storage", onStoreChange);
    window.addEventListener(STORAGE_EVENT, onStoreChange);
    return () => {
      window.removeEventListener("storage", onStoreChange);
      window.removeEventListener(STORAGE_EVENT, onStoreChange);
    };
  }, []);
  const getSnapshot = useCallback(
    () => {
      return peekContextPanelPreference(window.localStorage, storageKey);
    },
    [storageKey],
  );
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, () => false);

  useEffect(() => {
    readContextPanelPreference(window.localStorage, storageKey);
  }, [storageKey]);

  const toggle = () => {
    writeContextPanelPreference(window.localStorage, storageKey, !collapsed);
    window.dispatchEvent(new Event(STORAGE_EVENT));
  };

  const panelId = `context-panel-${storageKey}`;

  return (
    <div className="ui-context-panel grid h-full min-h-0 w-full min-w-0 grid-rows-[auto_minmax(0,1fr)]" data-collapsed={collapsed} data-mobile-always-open={mobileAlwaysOpen ? "true" : undefined} data-storage-key={contextPanelStorageKey(storageKey)} id={panelId}>
      <header className={classNames("ui-context-panel__header flex min-h-14 items-center justify-between gap-3 px-4", collapsed && "justify-center px-2")}>
        <div className={classNames("ui-context-panel__heading flex min-w-0 items-baseline gap-2", collapsed && "hidden")}>
          <h2 className="m-0 truncate text-base font-semibold">{title}</h2>
          {count === undefined ? null : <span className="font-mono text-xs text-[var(--text-tertiary)]">{count}</span>}
        </div>
        <button aria-controls={`${panelId}-body`} aria-expanded={!collapsed} className="grid size-11 shrink-0 place-items-center rounded-[var(--shape-control)] border-0 bg-transparent text-[var(--text-secondary)] transition-colors duration-[120ms] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]" aria-label={collapsed ? "文脈パネルを開く" : "文脈パネルを閉じる"} onClick={toggle} type="button">
          <CaretLeft aria-hidden className={classNames("transition-transform duration-[180ms] motion-reduce:transition-none", collapsed && "rotate-180")} size={17} />
        </button>
      </header>
      <div className={classNames("ui-context-panel__body min-h-0 w-full min-w-0 overflow-y-auto", collapsed && "hidden")} id={`${panelId}-body`}>{children}</div>
    </div>
  );
}
