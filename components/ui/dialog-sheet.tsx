"use client";

import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { X } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { IconButton } from "./icon-button";
import { classNames } from "./class-names";

type DialogSheetProps = Readonly<{
  children: ReactNode;
  description?: ReactNode;
  label: ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  placement?: "center" | "right" | "bottom";
  title: ReactNode;
}>;

const placementClasses = {
  center: "max-h-[calc(100dvh-2rem)] w-full max-w-[42rem] rounded-[var(--shape-sheet)]",
  right: "ml-auto h-dvh w-[min(28rem,100%)] rounded-l-[var(--shape-sheet)]",
  bottom: "mt-auto max-h-[calc(100dvh-1rem)] w-full rounded-t-[var(--shape-sheet)]",
} as const;

const placementMotion = {
  center: { initial: { opacity: 0, scale: 0.99, y: 6 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.99, y: 4 } },
  right: { initial: { opacity: 0, x: 16 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 16 } },
  bottom: { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 16 } },
} as const;

export function DialogSheet({
  children,
  description,
  label,
  onOpenChange,
  open,
  placement = "right",
  title,
}: DialogSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(open);
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    let frame: number | undefined;
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);

    if (open) {
      if (!dialog.open) dialog.showModal();
      frame = window.requestAnimationFrame(() => setVisible(true));
    } else {
      frame = window.requestAnimationFrame(() => setVisible(false));
      closeTimer.current = setTimeout(() => {
        if (dialog.open) dialog.close();
      }, reduceMotion ? 80 : 180);
    }

    return () => {
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    };
  }, [open, reduceMotion]);

  const panelMotion = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : placementMotion[placement];
  const duration = reduceMotion ? 0.08 : 0.18;

  return (
    <dialog
      aria-describedby={description === undefined ? undefined : descriptionId}
      aria-labelledby={titleId}
      className={classNames(
        "ui-dialog-sheet fixed inset-0 z-50 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden bg-transparent p-0 text-[var(--text-primary)] backdrop:bg-transparent",
        placement === "center" && "grid place-items-center p-4",
        placement === "right" && "flex justify-end",
        placement === "bottom" && "flex items-end",
        !open && "pointer-events-none",
      )}
      onCancel={(event) => {
        event.preventDefault();
        onOpenChange(false);
      }}
      onClick={(event) => {
        if (event.currentTarget === event.target) onOpenChange(false);
      }}
      ref={dialogRef}
    >
      <AnimatePresence>
        {visible ? (
          <m.div
            animate={{ opacity: 1 }}
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            transition={{ duration }}
          />
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {visible ? (
          <m.section
            animate={panelMotion.animate}
            className={classNames(
              "relative z-10 flex max-w-full flex-col overflow-hidden bg-[var(--surface-elevated)] shadow-[var(--shadow-elevated)]",
              placementClasses[placement],
            )}
            exit={panelMotion.exit}
            initial={panelMotion.initial}
            transition={{ duration, ease: [0.16, 1, 0.3, 1] }}
          >
            <header className="flex min-h-16 items-start gap-3 px-4 py-3 sm:px-5">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-[var(--accent-400)]">{label}</span>
                <h2 className="m-0 mt-0.5 text-lg font-semibold text-[var(--text-primary)]" id={titleId}>{title}</h2>
                {description === undefined ? null : (
                  <p className="m-0 mt-1 text-sm leading-6 text-[var(--text-secondary)]" id={descriptionId}>{description}</p>
                )}
              </div>
              <IconButton icon={<X size={20} />} label="閉じる" onClick={() => onOpenChange(false)} variant="ghost" />
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5 sm:px-5">{children}</div>
          </m.section>
        ) : null}
      </AnimatePresence>
    </dialog>
  );
}
