import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { classNames } from "./class-names";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "compact" | "standard";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-[var(--accent-500)] text-[var(--accent-contrast)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent-600)_70%,transparent)] hover:bg-[var(--accent-400)]",
  secondary: "bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-control)] hover:bg-[var(--surface-selected)]",
  ghost: "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]",
  danger: "bg-[var(--status-error-soft)] text-[var(--status-error)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--status-error)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--status-error-soft)_78%,var(--status-error))]",
};

const sizeClasses: Record<ButtonSize, string> = {
  compact: "min-h-11 px-3 py-2",
  standard: "min-h-11 px-4 py-2.5",
};

export type ButtonProps = Readonly<
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
    children: ReactNode;
    icon?: ReactNode;
    loading?: boolean;
    size?: ButtonSize;
    variant?: ButtonVariant;
  }
>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  children,
  className,
  disabled,
  icon,
  loading = false,
  size = "standard",
  type = "button",
  variant = "secondary",
  ...buttonProps
}: ButtonProps, ref) {
  const classes = classNames(
    "ui-button inline-flex min-w-0 max-w-full cursor-pointer select-none items-center justify-center gap-2 rounded-[var(--shape-control)] border-0 text-center text-[var(--font-size-label)] font-semibold leading-none no-underline transition-[background-color,color,box-shadow,opacity,transform] duration-[120ms]",
    "focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] active:scale-[.98] motion-reduce:active:scale-100 disabled:cursor-not-allowed disabled:opacity-45 disabled:transform-none",
    `ui-button--${variant}`,
    `ui-button--${size}`,
    variantClasses[variant],
    sizeClasses[size],
    className,
  );

  return (
    <button
      {...buttonProps}
      aria-busy={loading}
      className={classes}
      disabled={disabled || loading}
      ref={ref}
      type={type}
    >
      {loading ? (
        <span aria-hidden className="ui-spinner size-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent opacity-70 motion-reduce:animate-none" />
      ) : (
        <span className="grid shrink-0 place-items-center">{icon}</span>
      )}
      <span className="ui-button__label min-w-0 overflow-wrap-anywhere">{children}</span>
    </button>
  );
});
