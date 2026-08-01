"use client";

import { CaretLeft } from "@phosphor-icons/react";
import { useCallback, useEffect, useSyncExternalStore, type ReactNode } from "react";

import { contextPanelStorageKey, peekContextPanelPreference, readContextPanelPreference, writeContextPanelPreference } from "./layout-preferences";

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

  return (
    <div className="ui-context-panel" data-collapsed={collapsed} data-mobile-always-open={mobileAlwaysOpen ? "true" : undefined} data-storage-key={contextPanelStorageKey(storageKey)}>
      <header className="ui-context-panel__header">
        <div className="ui-context-panel__heading">
          <h2>{title}</h2>
          {count === undefined ? null : <span>{count}</span>}
        </div>
        <button aria-expanded={!collapsed} aria-label={collapsed ? "文脈パネルを開く" : "文脈パネルを閉じる"} onClick={toggle} type="button">
          <CaretLeft aria-hidden size={17} />
        </button>
      </header>
      <div className="ui-context-panel__body">{children}</div>
    </div>
  );
}
