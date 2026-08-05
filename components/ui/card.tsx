import type { ElementType, ReactNode } from "react";

import { classNames } from "./class-names";

export type CardTone = "default" | "elevated" | "selected" | "inset";
export type CardPadding = "none" | "compact" | "standard" | "spacious";

type CardProps = Readonly<{
  "aria-labelledby"?: string;
  "aria-label"?: string;
  as?: ElementType;
  children: ReactNode;
  className?: string;
  id?: string;
  padding?: CardPadding;
  tone?: CardTone;
}>;

const toneClasses: Record<CardTone, string> = {
  default: "bg-[var(--surface-primary)]",
  elevated: "bg-[var(--surface-elevated)] shadow-[var(--shadow-surface)]",
  selected: "bg-[var(--surface-selected)]",
  inset: "bg-[var(--surface-inset)]",
};

const paddingClasses: Record<CardPadding, string> = {
  none: "p-0",
  compact: "p-3 sm:p-4",
  standard: "p-4 sm:p-6",
  spacious: "p-5 sm:p-8",
};

export function Card({
  "aria-labelledby": ariaLabelledBy,
  "aria-label": ariaLabel,
  as: Component = "section",
  children,
  className,
  id,
  padding = "standard",
  tone = "default",
}: CardProps) {
  return (
    <Component
      className={classNames(
        "ui-card min-w-0 rounded-[var(--shape-card)]",
        toneClasses[tone],
        paddingClasses[padding],
        className,
      )}
      id={id}
      aria-labelledby={ariaLabelledBy}
      aria-label={ariaLabel}
    >
      {children}
    </Component>
  );
}
