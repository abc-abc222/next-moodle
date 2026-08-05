type SkeletonProps = Readonly<{
  className?: string | undefined;
}>;

export function Skeleton({ className }: SkeletonProps) {
  const classes = classNames(
    "ui-skeleton block min-h-4 animate-pulse rounded-[var(--shape-control)] bg-[var(--surface-inset)] motion-reduce:animate-none motion-reduce:opacity-70",
    className,
  );
  return <span aria-hidden className={classes} />;
}
import { classNames } from "./class-names";
