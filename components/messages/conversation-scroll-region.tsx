"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";

type ConversationScrollRegionProps = Readonly<{
  children: ReactNode;
  messageCount: number;
}>;

const BOTTOM_THRESHOLD = 48;

function scrollToBottom(viewport: HTMLDivElement): void {
  viewport.scrollTop = viewport.scrollHeight;
}

export function ConversationScrollRegion({ children, messageCount }: ConversationScrollRegionProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const previousMessageCountRef = useRef(messageCount);
  const shouldStickToBottomRef = useRef(true);
  const initializedRef = useRef(false);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (viewport === null) return;

    const hasNewMessage = messageCount > previousMessageCountRef.current;
    if (!initializedRef.current || (hasNewMessage && shouldStickToBottomRef.current)) {
      // Assigning scrollTop avoids a visible route-refresh animation while a
      // learner is sending a reply or opening a conversation for the first time.
      scrollToBottom(viewport);
    }
    previousMessageCountRef.current = messageCount;
    initializedRef.current = true;
  }, [messageCount]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport === null) return;

    const restoreViewport = () => {
      if (!document.hidden && shouldStickToBottomRef.current) scrollToBottom(viewport);
    };
    const handleVisibilityChange = () => restoreViewport();
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(restoreViewport);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    resizeObserver?.observe(viewport);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      resizeObserver?.disconnect();
    };
  }, []);

  return (
    <div
      className="ui-message-thread__scroll h-full min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain [scrollbar-gutter:stable]"
      onScroll={(event) => {
        const viewport = event.currentTarget;
        shouldStickToBottomRef.current = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= BOTTOM_THRESHOLD;
      }}
      ref={viewportRef}
    >
      {children}
    </div>
  );
}
