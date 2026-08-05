import { Skeleton } from "./skeleton";
import { classNames } from "./class-names";

type SkeletonGroupProps = Readonly<{
  className?: string;
  rows?: number;
}>;

export function SkeletonGroup({ className, rows = 3 }: SkeletonGroupProps) {
  return (
    <div
      aria-busy="true"
      aria-label="読み込み中"
      className={classNames("ui-skeleton-group grid gap-3", className)}
      role="status"
    >
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton
          className={classNames("h-14 w-full", index === rows - 1 && rows > 1 && "w-4/5")}
          key={index}
        />
      ))}
    </div>
  );
}
