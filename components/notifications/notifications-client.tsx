"use client";

import { WarningCircle } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

import { Button, Notice } from "@/components/ui";
import { PageFrame, RouteHeader } from "@/components/app-shell/workspace-frame";
import type { AppRuntimeConfig } from "@/lib/app-config";
import {
  NotificationsApiSuccessSchema,
  type NotificationFilter,
  type NotificationsData,
  type NotificationsPageState,
} from "@/lib/moodle/queries/notifications-schema";
import type { MoodleNotificationId } from "@/lib/moodle/identifiers";

import { createNotificationPoller } from "./polling";
import { NotificationList } from "./notification-list";
import { NotificationStatusNotice } from "./status-notice";

type NotificationsClientProps = Readonly<{
  initialState: NotificationsPageState;
  runtimeConfig: AppRuntimeConfig;
}>;

function updateReadState(
  data: NotificationsData,
  notificationId: MoodleNotificationId,
  read: boolean,
): NotificationsData {
  const target = data.notifications.find((item) => item.id === notificationId);
  if (target === undefined || target.read === read) {
    return data;
  }
  return {
    notifications: data.notifications.map((item) =>
      item.id === notificationId ? { ...item, read } : item,
    ),
    unreadCount: Math.max(0, data.unreadCount + (read ? -1 : 1)),
  };
}

function mergeNotificationData(
  current: NotificationsData,
  next: NotificationsData,
  locallyReadIds: ReadonlySet<number> = new Set<number>(),
): NotificationsData {
  const nextIds = new Set(next.notifications.map((item) => item.id));
  const retainedRead = current.notifications.filter(
    (item) =>
      !nextIds.has(item.id) &&
      (item.read || locallyReadIds.has(item.id)),
  );
  const notifications = [...next.notifications, ...retainedRead].sort(
    (left, right) => right.timeCreated - left.timeCreated,
  );
  return { notifications, unreadCount: next.unreadCount };
}

export function NotificationsClient({
  initialState,
  runtimeConfig,
}: NotificationsClientProps) {
  const [pageState, setPageState] = useState(initialState);
  const [filter, setFilter] = useState<NotificationFilter>("unread");
  const [pendingId, setPendingId] = useState<MoodleNotificationId | undefined>();
  const [pollError, setPollError] = useState(false);
  const [readError, setReadError] = useState(false);
  const locallyReadIds = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (pageState.kind !== "ready") {
      return undefined;
    }
    const poller = createNotificationPoller({
      isVisible: () => document.visibilityState === "visible",
      schedule: (callback, delay) => window.setTimeout(callback, delay),
      cancel: (id) => window.clearTimeout(id),
      fetchNotifications: async (signal) => {
        const response = await fetch("/api/notifications?filter=all", {
          cache: "no-store",
          credentials: "same-origin",
          headers: { accept: "application/json" },
          signal,
        });
        if (response.status === 401) {
          setPageState({ kind: "auth" });
          return;
        }
        if (!response.ok) {
          throw new Error("Notification polling failed.");
        }
        const payload: unknown = await response.json();
        const parsed = NotificationsApiSuccessSchema.safeParse(payload);
        if (!parsed.success) {
          throw new Error("Notification polling returned an invalid response.");
        }
        setPageState((current) => {
          if (current.kind !== "ready") {
            return current;
          }
          return {
            kind: "ready",
            data: mergeNotificationData(
              current.data,
              parsed.data,
              locallyReadIds.current,
            ),
          };
        });
        setPollError(false);
      },
      onError: () => setPollError(true),
    });
    const onVisibilityChange = (): void => {
      poller.setVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    poller.start();
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      poller.stop();
    };
  }, [pageState.kind]);

  const markRead = async (notificationId: MoodleNotificationId): Promise<void> => {
    if (pendingId !== undefined || pageState.kind !== "ready") {
      return;
    }
    const target = pageState.data.notifications.find(
      (item) => item.id === notificationId,
    );
    if (target === undefined || target.read) {
      return;
    }
    locallyReadIds.current.add(notificationId);
    setReadError(false);
    setPendingId(notificationId);
    setPageState((current) =>
      current.kind === "ready"
        ? { kind: "ready", data: updateReadState(current.data, notificationId, true) }
        : current,
    );
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "POST",
        credentials: "same-origin",
        headers: { accept: "application/json" },
      });
      if (response.status === 401) {
        locallyReadIds.current.delete(notificationId);
        setPageState({ kind: "auth" });
        return;
      }
      if (!response.ok) {
        locallyReadIds.current.delete(notificationId);
        setPageState((current) =>
          current.kind === "ready"
            ? { kind: "ready", data: updateReadState(current.data, notificationId, false) }
            : current,
        );
        setReadError(true);
      }
    } catch (error) {
      locallyReadIds.current.delete(notificationId);
      setPageState((current) =>
        current.kind === "ready"
          ? { kind: "ready", data: updateReadState(current.data, notificationId, false) }
          : current,
      );
      if (error instanceof Error) {
        setReadError(true);
      } else {
        throw error;
      }
    } finally {
      setPendingId(undefined);
    }
  };

  return (
    <PageFrame
      content={<section className="grid min-w-0 gap-5" aria-label="通知一覧">
        {pollError ? (
          <Notice tone="warning" title="自動更新を一時停止しました">
            Moodleから応答がありませんでした。現在の一覧はそのまま確認できます。
          </Notice>
        ) : null}
        {readError ? (
          <Notice tone="error" title="既読にできませんでした">
            入力内容は失われていません。Moodleへ接続できる状態で、もう一度お試しください。
          </Notice>
        ) : null}
        <div aria-live="polite" className="flex min-h-6 items-center gap-2 text-xs text-[var(--text-tertiary)]">
          <WarningCircle aria-hidden size={15} weight="regular" /> この画面を表示中だけ、60秒ごとに更新します。
        </div>
        {pageState.kind === "ready" ? (
          <NotificationList
            data={pageState.data}
            filter={filter}
            onMarkRead={(id) => void markRead(id)}
            pendingId={pendingId}
            runtimeConfig={runtimeConfig}
          />
        ) : (
          <NotificationStatusNotice kind={pageState.kind} />
        )}
      </section>}
      header={<RouteHeader
        actions={<div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-[var(--shape-control)] bg-[var(--surface-inset)] p-1" role="group" aria-label="通知の絞り込み">
            <Button
              aria-pressed={filter === "unread"}
              onClick={() => setFilter("unread")}
              size="compact"
              variant={filter === "unread" ? "secondary" : "ghost"}
            >
              未読
            </Button>
            <Button
              aria-pressed={filter === "all"}
              onClick={() => setFilter("all")}
              size="compact"
              variant={filter === "all" ? "secondary" : "ghost"}
            >
              すべて
            </Button>
          </div>
          {pageState.kind === "ready" ? (
            <span className="tabular-nums text-xs text-[var(--text-tertiary)]" aria-live="polite">
              未読 {pageState.data.unreadCount}件
            </span>
          ) : null}
        </div>}
        description="フィードバックやお知らせを、未読順の受信箱で確認します。"
        eyebrow="INBOX"
        title="通知"
      />}
      mode="overview"
      width="standard"
    />
  );
}
