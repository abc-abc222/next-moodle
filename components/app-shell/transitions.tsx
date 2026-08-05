import Link from "next/link";
import { ViewTransition } from "react";
import type { ComponentProps, ReactNode } from "react";

import {
  motionIntentToTransitionTypes,
  sharedTransitionName,
} from "./motion";
import type { MotionIntent, SharedTransitionKind } from "./motion";
import { classNames } from "@/components/ui/class-names";

const ROUTE_TRANSITION_CLASSES = {
  default: "none",
  "drill-in": "workspace-drill-in",
  return: "workspace-return",
  switch: "workspace-switch",
} as const;

type NavigationMotionIntent = Exclude<MotionIntent, "reveal">;

type TransitionLinkProps = Omit<ComponentProps<typeof Link>, "transitionTypes"> & Readonly<{
  intent: NavigationMotionIntent;
}>;

export function TransitionLink({ intent, ...props }: TransitionLinkProps) {
  const actionLink = typeof props.className === "string" && props.className.includes("ui-app-action-link");
  return (
    <Link
      {...props}
      className={classNames(
        props.className,
        actionLink && "inline-flex min-h-11 max-w-full min-w-0 items-center justify-center gap-2 rounded-[var(--shape-control)] bg-[var(--surface-elevated)] px-3 py-2 text-center text-xs font-semibold text-[var(--text-primary)] no-underline shadow-[var(--shadow-control)] transition-colors duration-[120ms] hover:bg-[var(--surface-selected)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
      )}
      transitionTypes={motionIntentToTransitionTypes(intent)}
    />
  );
}

export function WorkspaceTransition({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <ViewTransition
      default="none"
      enter={ROUTE_TRANSITION_CLASSES}
      exit={ROUTE_TRANSITION_CLASSES}
    >
      {children}
    </ViewTransition>
  );
}

export function RevealTransition({ children }: Readonly<{ children: ReactNode }>) {
  return <ViewTransition default="none" enter="workspace-reveal">{children}</ViewTransition>;
}

export function SharedTransition({
  children,
  identifier,
  kind,
}: Readonly<{
  children: ReactNode;
  identifier: string | number;
  kind: SharedTransitionKind;
}>) {
  return (
    <ViewTransition
      name={sharedTransitionName(kind, identifier)}
      share="workspace-shared"
    >
      {children}
    </ViewTransition>
  );
}
