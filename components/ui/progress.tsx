import { classNames } from "./class-names";

type ProgressProps = Readonly<{
  className?: string;
  label: string;
  showValue?: boolean;
  value: number;
}>;

export function Progress({ className, label, showValue = false, value }: ProgressProps) {
  const normalized = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={classNames("ui-progress grid min-w-0 gap-2", className)}>
      <div className="flex items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">
        <span>{label}</span>
        {showValue ? <span className="tabular-nums">{normalized}%</span> : null}
      </div>
      <progress
        aria-label={label}
        className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-inset)] accent-[var(--accent-500)] [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-[var(--accent-500)] [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-[var(--surface-inset)] [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-[var(--accent-500)]"
        max={100}
        value={normalized}
      />
    </div>
  );
}
