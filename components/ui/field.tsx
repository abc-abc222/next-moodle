import type { InputHTMLAttributes, ReactNode } from "react";
import { classNames } from "./class-names";

export type FieldStatus = "default" | "success" | "error";

type FieldProps = Readonly<
  Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "aria-describedby" | "aria-invalid" | "id" | "size"
  > & {
    demoState?: "hover" | "focus";
    description?: ReactNode;
    id: string;
    label: ReactNode;
    message?: ReactNode;
    status?: FieldStatus;
  }
>;

export function Field({
  className,
  demoState,
  description,
  id,
  label,
  message,
  status = "default",
  ...inputProps
}: FieldProps) {
  const descriptionId = description ? `${id}-description` : undefined;
  const messageId = message ? `${id}-message` : undefined;
  const describedBy = [descriptionId, messageId].filter(Boolean).join(" ");
  const inputClasses = classNames(
    "ui-field__input min-h-11 w-full min-w-0 rounded-[var(--shape-control)] border-0 bg-transparent px-4 py-3 text-sm leading-6 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] disabled:cursor-not-allowed disabled:text-[var(--text-disabled)]",
    className,
  );

  return (
    <div className={`ui-field ui-field--${status} grid min-w-0 gap-2`} data-demo-state={demoState}>
      <label className="ui-field__label text-[var(--font-size-label)] font-semibold leading-snug text-[var(--text-primary)]" htmlFor={id}>
        {label}
      </label>
      {description ? (
        <span className="ui-field__description text-xs leading-5 text-[var(--text-secondary)]" id={descriptionId}>
          {description}
        </span>
      ) : null}
      <span className={classNames(
        "ui-field__shell flex min-h-11 items-center rounded-[var(--shape-control)] bg-[var(--surface-inset)] shadow-[var(--shadow-control)] transition-shadow duration-[120ms] hover:shadow-[0_0_0_1px_var(--border-strong)] focus-within:shadow-[var(--shadow-focus)]",
        status === "error" && "shadow-[0_0_0_1px_var(--status-error)]",
        status === "success" && "shadow-[0_0_0_1px_var(--status-success)]",
      )}>
        <input
          {...inputProps}
          aria-describedby={describedBy || undefined}
          aria-invalid={status === "error"}
          className={inputClasses}
          id={id}
        />
      </span>
      {message ? (
        <span className={classNames(
          "ui-field__message text-xs leading-5 text-[var(--text-secondary)]",
          status === "error" && "text-[var(--status-error)]",
          status === "success" && "text-[var(--status-success)]",
        )} id={messageId}>
          {message}
        </span>
      ) : null}
    </div>
  );
}
