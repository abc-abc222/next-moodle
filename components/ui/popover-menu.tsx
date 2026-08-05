"use client";

import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import {
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";

import { classNames } from "./class-names";

type PopoverMenuProps = Readonly<{
  align?: "start" | "end";
  children: ReactNode;
  label: string;
  side?: "bottom" | "top";
  trigger: ReactElement<{ onClick?: () => void }>;
}>;

export function PopoverMenu({ align = "end", children, label, side = "bottom", trigger }: PopoverMenuProps) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const focusTrigger = () => rootRef.current?.querySelector<HTMLElement>("[aria-haspopup='menu']")?.focus();

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        focusTrigger();
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        focusTrigger();
      }
    };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLElement>("[role='menuitem'], a, button")?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  const triggerElement = isValidElement(trigger)
    ? cloneElement(trigger, {
        "aria-expanded": open,
        "aria-haspopup": "menu",
        onClick: () => {
          trigger.props.onClick?.();
          setOpen((value) => !value);
        },
      } as never)
    : trigger;

  return (
    <div className="ui-popover-menu relative" ref={rootRef}>
      {triggerElement}
      <AnimatePresence>
        {open ? (
          <m.div
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            aria-label={label}
            className={classNames(
              "absolute z-50 max-h-[min(36rem,calc(100dvh-1rem))] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto overflow-x-hidden rounded-[var(--shape-sheet)] bg-[var(--surface-elevated)] p-2 shadow-[var(--shadow-elevated)]",
              side === "top"
                ? align === "end" ? "right-0 bottom-full mb-2 origin-bottom-right" : "left-0 bottom-full mb-2 origin-bottom-left"
                : align === "end" ? "right-0 top-full mt-2 origin-top-right" : "left-0 top-full mt-2 origin-top-left",
            )}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.99, y: -4 }}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.99, y: -4 }}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("a,button,[role='menuitem']")) setOpen(false);
            }}
            role="menu"
            ref={menuRef}
            transition={{ duration: reduceMotion ? 0.08 : 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
