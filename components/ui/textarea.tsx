import { useId, type TextareaHTMLAttributes } from "react";
import { classNames } from "./class-names";

type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & Readonly<{
  description?: string;
  id?: string;
  label: string;
  message?: string;
}>;

export function Textarea({ description, id, label, message, ...props }: TextareaProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const descriptionId = description === undefined ? undefined : `${controlId}-description`;
  const messageId = message === undefined ? undefined : `${controlId}-message`;
  const describedBy = [descriptionId, messageId].filter(Boolean).join(" ") || undefined;
  return (
    <label className="ui-textarea grid min-w-0 gap-2" htmlFor={controlId}>
      <span className="ui-field__label text-[var(--font-size-label)] font-semibold leading-snug text-[var(--text-primary)]">{label}</span>
      {description === undefined ? null : (
        <span className="ui-field__description text-xs leading-5 text-[var(--text-secondary)]" id={descriptionId}>{description}</span>
      )}
      <textarea
        {...props}
        aria-describedby={describedBy}
        className={classNames(
          "ui-textarea__input min-h-44 w-full min-w-0 resize-y rounded-[var(--shape-card)] border-0 bg-[var(--surface-inset)] p-4 leading-7 text-[var(--text-primary)] shadow-[var(--shadow-control)] outline-none transition-shadow duration-[120ms] placeholder:text-[var(--text-tertiary)] focus-visible:shadow-[var(--shadow-focus)]",
          props.className,
        )}
        id={controlId}
      />
      {message === undefined ? null : (
        <span className="ui-field__message text-xs leading-5 text-[var(--text-secondary)]" id={messageId}>{message}</span>
      )}
    </label>
  );
}
