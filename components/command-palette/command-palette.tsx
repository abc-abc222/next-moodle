"use client";

import {
  ArrowRight,
  BookOpen,
  ChatCircleDots,
  File,
  FileText,
  MagnifyingGlass,
  SquaresFour,
  X,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { Button, DialogSheet, EmptyState } from "@/components/ui";
import { classNames } from "@/components/ui/class-names";
import { searchCommands, type CommandItem } from "./search";

type CommandPaletteProps = Readonly<{
  commands: readonly CommandItem[];
}>;

const RECENT_COMMANDS_STORAGE_KEY = "next-moodle-recent-commands";
const MAX_RECENT_COMMANDS = 6;

function readRecentCommands(): readonly CommandItem[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(RECENT_COMMANDS_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.flatMap((item): readonly CommandItem[] => {
      if (typeof item !== "object" || item === null) return [];
      const record = item as Record<string, unknown>;
      if (typeof record.href !== "string" || typeof record.label !== "string" || !Array.isArray(record.keywords)) return [];
      if (!["activity", "course", "file", "message", "screen"].includes(String(record.kind))) return [];
      const keywords = record.keywords.filter((keyword): keyword is string => typeof keyword === "string");
      return [{ href: record.href, keywords, kind: record.kind as CommandItem["kind"], label: record.label }];
    });
  } catch {
    return [];
  }
}

export function CommandPalette({ commands }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [remoteCommands, setRemoteCommands] = useState<readonly CommandItem[]>([]);
  const [recentCommands, setRecentCommands] = useState<readonly CommandItem[]>([]);
  const [remoteState, setRemoteState] = useState<"idle" | "loading" | "error">("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const listId = useId();
  const titleId = useId();
  const results = useMemo(() => searchCommands([...recentCommands, ...commands, ...remoteCommands], query), [commands, query, recentCommands, remoteCommands]);

  const openPalette = useCallback(() => {
    setQuery("");
    setRemoteCommands([]);
    setRemoteState("idle");
    setRecentCommands(readRecentCommands());
    setSelectedIndex(0);
    setOpen(true);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase("en") === "k") {
        const trigger = rootRef.current?.querySelector<HTMLButtonElement>(".ui-command-trigger");
        if (trigger === undefined || trigger === null || trigger.getClientRects().length === 0) return;
        event.preventDefault();
        openPalette();
      } else if (event.key === "?" && event.target instanceof HTMLElement &&
        !event.target.matches("input, textarea, select, [contenteditable='true']")) {
        event.preventDefault();
        router.push("/shortcuts");
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [openPalette, router]);

  useEffect(() => {
    const normalized = query.normalize("NFKC").trim();
    if (!open || normalized.length < 2) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setRemoteState("loading");
        const response = await fetch(`/api/search?q=${encodeURIComponent(normalized)}`, {
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });
        if (!response.ok) {
          setRemoteState("error");
          return;
        }
        const payload: unknown = await response.json();
        if (typeof payload !== "object" || payload === null || !("results" in payload) || !Array.isArray(payload.results)) return;
        const parsed = payload.results.flatMap((item): readonly CommandItem[] => {
          if (typeof item !== "object" || item === null) return [];
          const record = item as Record<string, unknown>;
          if (typeof record["href"] !== "string" || typeof record["label"] !== "string" || !Array.isArray(record["keywords"])) return [];
          if (record["kind"] !== "activity" && record["kind"] !== "file" && record["kind"] !== "message") return [];
          const keywords = record["keywords"].filter((keyword): keyword is string => typeof keyword === "string");
          return [{ href: record["href"], keywords, kind: record["kind"], label: record["label"] }];
        });
        setRemoteCommands(parsed);
        setSelectedIndex(0);
        setRemoteState("idle");
      } catch {
        if (!controller.signal.aborted) setRemoteState("error");
        return;
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query]);

  const choose = (command: CommandItem) => {
    const nextRecent = [command, ...recentCommands.filter((item) => item.href !== command.href || item.kind !== command.kind)]
      .slice(0, MAX_RECENT_COMMANDS);
    setRecentCommands(nextRecent);
    window.localStorage.setItem(RECENT_COMMANDS_STORAGE_KEY, JSON.stringify(nextRecent));
    setOpen(false);
    router.push(command.href, { transitionTypes: ["switch"] });
  };

  return (
    <div className="ui-command-root contents" ref={rootRef}>
      <Button
        aria-label="移動・検索"
        aria-expanded={open}
        aria-haspopup="dialog"
        className="ui-command-trigger min-w-11 justify-between md:min-w-[min(18rem,40vw)]"
        icon={<MagnifyingGlass aria-hidden size={18} weight="regular" />}
        onClick={openPalette}
        variant="secondary"
      >
        <span className="hidden md:inline">移動・検索</span>
        <kbd className="hidden rounded-md bg-[var(--surface-inset)] px-2 py-1 font-mono text-xs text-[var(--text-tertiary)] md:inline">⌘K</kbd>
      </Button>
      <DialogSheet
        description="画面、コース、活動、メッセージ、ファイルを横断します。"
        label="コマンド"
        onOpenChange={setOpen}
        open={open}
        placement="center"
        title="移動・検索"
      >
        <div className="ui-command-panel grid max-h-[min(34rem,calc(100dvh-12rem))] min-h-0 grid-rows-[auto_minmax(0,1fr)_auto]">
          <h2 className="ui-sr-only" id={titleId}>画面とコースを検索</h2>
          <div className="ui-command-search grid min-h-12 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--shape-control)] bg-[var(--surface-inset)] px-3 shadow-[var(--shadow-focus)]">
            <MagnifyingGlass aria-hidden className="shrink-0 text-[var(--text-secondary)]" size={20} weight="regular" />
            <label className="ui-sr-only" htmlFor={`${listId}-input`}>検索語</label>
            <input
              aria-activedescendant={
                results[selectedIndex] === undefined
                  ? undefined
                  : `${listId}-option-${selectedIndex}`
              }
              aria-controls={listId}
              aria-expanded="true"
              autoComplete="off"
              className="min-h-12 min-w-0 border-0 bg-transparent text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
              id={`${listId}-input`}
              onChange={(event) => {
                setQuery(event.currentTarget.value);
                setRemoteCommands([]);
                setRemoteState("idle");
                setSelectedIndex(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setSelectedIndex((index) => Math.min(index + 1, results.length - 1));
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setSelectedIndex((index) => Math.max(index - 1, 0));
                } else if (event.key === "Enter") {
                  event.preventDefault();
                  const selected = results[selectedIndex];
                  if (selected !== undefined) {
                    choose(selected);
                  }
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  setOpen(false);
                }
              }}
              placeholder="画面名、コース名、活動名"
              ref={inputRef}
              role="combobox"
              value={query}
            />
            <span className="ui-command-search__tools inline-flex items-center gap-1">
              <kbd className="hidden rounded-md bg-[var(--surface-elevated)] px-2 py-1 font-mono text-xs text-[var(--text-tertiary)] sm:inline">Esc</kbd>
              <button aria-label="検索を閉じる" className="grid size-9 place-items-center rounded-[var(--shape-control)] border-0 bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]" onClick={() => setOpen(false)} type="button"><X aria-hidden size={18} weight="regular" /></button>
            </span>
          </div>
          <div className="ui-command-results mt-3 grid min-h-0 gap-1 overflow-y-auto" id={listId} role="listbox">
            {results.length === 0 ? (
              <EmptyState className="my-1" icon={<MagnifyingGlass aria-hidden size={20} />} title="一致する結果はありません">別の言葉で検索してください。</EmptyState>
            ) : results.map((command, index) => (
              <button
                aria-selected={selectedIndex === index}
                className={classNames(
                  "ui-command-option grid min-h-12 grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-[var(--shape-control)] border-0 px-3 py-2 text-left text-[var(--text-secondary)] transition-colors duration-[120ms] max-sm:grid-cols-[auto_minmax(0,1fr)_auto]",
                  selectedIndex === index && "bg-[var(--surface-selected)] text-[var(--text-primary)]",
                )}
                id={`${listId}-option-${index}`}
                key={`${command.kind}-${command.href}`}
                onClick={() => choose(command)}
                onMouseEnter={() => setSelectedIndex(index)}
                role="option"
                type="button"
              >
                {command.kind === "course" ? (
                  <BookOpen aria-hidden size={20} weight="regular" />
                ) : command.kind === "activity" ? (
                  <FileText aria-hidden size={20} weight="regular" />
                ) : command.kind === "file" ? (
                  <File aria-hidden size={20} weight="regular" />
                ) : command.kind === "message" ? (
                  <ChatCircleDots aria-hidden size={20} weight="regular" />
                ) : (
                  <SquaresFour aria-hidden size={20} weight="regular" />
                )}
                <span className="min-w-0 truncate font-semibold">{command.label}</span>
                <small className="text-xs text-[var(--text-tertiary)] max-sm:hidden">{command.kind === "course" ? "コース" : command.kind === "activity" ? "活動" : command.kind === "file" ? "ファイル" : command.kind === "message" ? "会話" : "画面"}</small>
                <ArrowRight aria-hidden className="shrink-0" size={17} weight="regular" />
              </button>
            ))}
          </div>
          <p aria-live="polite" className="ui-command-help m-0 px-2 pt-3 text-xs text-[var(--text-tertiary)]">{remoteState === "loading" ? "Moodleを検索中…" : remoteState === "error" ? "Moodle検索を完了できませんでした。画面内の候補は利用できます。" : "上下キーで選択、Enterで移動、Escapeで閉じます。"}</p>
        </div>
      </DialogSheet>
    </div>
  );
}
