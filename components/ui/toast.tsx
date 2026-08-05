"use client";

import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { CheckCircle, Info, Warning, XCircle } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { classNames } from "./class-names";

export type ToastTone = "info" | "success" | "warning" | "error";

type ToastProps = Readonly<{
  action?: ReactNode;
  children: ReactNode;
  id: string;
  tone?: ToastTone;
  visible?: boolean;
}>;

const toneClasses: Record<ToastTone, string> = {
  info: "text-[var(--status-info)]",
  success: "text-[var(--status-success)]",
  warning: "text-[var(--status-warning)]",
  error: "text-[var(--status-error)]",
};

function ToastIcon({ tone }: Readonly<{ tone: ToastTone }>) {
  if (tone === "success") return <CheckCircle aria-hidden size={20} />;
  if (tone === "warning") return <Warning aria-hidden size={20} />;
  if (tone === "error") return <XCircle aria-hidden size={20} />;
  return <Info aria-hidden size={20} />;
}

export function Toast({ action, children, id, tone = "info", visible = true }: ToastProps) {
  const reduceMotion = useReducedMotion();
  return (
    <AnimatePresence>
      {visible ? (
        <m.div
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          className="ui-toast flex min-h-14 w-[min(24rem,calc(100vw-2rem))] items-center gap-3 rounded-[var(--shape-card)] bg-[var(--surface-elevated)] p-3 text-sm shadow-[var(--shadow-elevated)]"
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          key={id}
          role={tone === "error" ? "alert" : "status"}
          transition={{ duration: reduceMotion ? 0.08 : 0.18, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className={classNames("grid size-6 shrink-0 place-items-center", toneClasses[tone])}><ToastIcon tone={tone} /></span>
          <div className="min-w-0 flex-1 text-[var(--text-primary)]">{children}</div>
          {action}
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}

export function ToastRegion({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div
      aria-label="通知"
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-[calc(var(--mobile-nav-height,0px)+1rem)] z-[70] grid justify-items-end gap-2 [&>*]:pointer-events-auto md:bottom-4"
    >
      {children}
    </div>
  );
}
