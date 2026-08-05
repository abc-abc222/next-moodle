"use client";

import { ArrowRight, Bell, Check } from "@phosphor-icons/react";
import Link from "next/link";

import { Badge, Button, Card, EmptyState as UiEmptyState } from "@/components/ui";
import type { AppRuntimeConfig } from "@/lib/app-config";
import { dateTimeFormatter } from "@/lib/date-time";
import {
  filterNotifications,
  type NotificationFilter,
  type NotificationView,
  type NotificationsData,
} from "@/lib/moodle/queries/notifications-schema";
import type { MoodleNotificationId } from "@/lib/moodle/identifiers";

type NotificationListProps = Readonly<{
  data: NotificationsData;
  filter: NotificationFilter;
  onMarkRead: (id: MoodleNotificationId) => void;
  pendingId: MoodleNotificationId | undefined;
  runtimeConfig: AppRuntimeConfig;
}>;

function EmptyState({ filter }: Readonly<{ filter: NotificationFilter }>) {
  return (
    <UiEmptyState icon={<Bell aria-hidden size={22} />} title={filter === "unread" ? "未読の通知はありません" : "通知はまだありません"}>
      {filter === "unread"
        ? "この画面を開いている間、新しい通知を60秒ごとに確認します。"
        : "Moodleから通知が届くと、ここに時系列で表示されます。"}
    </UiEmptyState>
  );
}

function NotificationItem({
  notification,
  onMarkRead,
  pendingId,
  timeFormatter,
}: Readonly<{
  notification: NotificationView;
  onMarkRead: (id: MoodleNotificationId) => void;
  pendingId: MoodleNotificationId | undefined;
  timeFormatter: Intl.DateTimeFormat;
}>) {
  const isPending = pendingId === notification.id;
  return (
    <li className="relative grid gap-4 rounded-[var(--shape-card)] bg-[var(--surface-primary)] p-4 transition-colors duration-[120ms] hover:bg-[var(--surface-elevated)] data-[unread=true]:bg-[var(--surface-selected)] sm:p-5" data-unread={!notification.read}>
      {!notification.read ? <span aria-hidden className="absolute inset-y-4 left-0 w-[3px] rounded-r bg-[var(--accent-500)]" /> : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid min-w-0 gap-1">
          <h2 className="m-0 text-base leading-snug font-semibold text-[var(--text-primary)] text-balance">{notification.subject}</h2>
          <time
            className="text-xs text-[var(--text-tertiary)]"
            dateTime={new Date(notification.timeCreated * 1_000).toISOString()}
          >
            {timeFormatter.format(new Date(notification.timeCreated * 1_000))}
          </time>
        </div>
        <Badge
          icon={notification.read ? <Check weight="bold" /> : <Bell weight="bold" />}
          tone={notification.read ? "neutral" : "accent"}
        >
          {notification.read ? "既読" : "未読"}
        </Badge>
      </div>
      <p className="m-0 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">{notification.message}</p>
      <div className="flex flex-wrap items-center gap-2">
        {notification.href ? (
          <Link
            className="inline-flex min-h-11 items-center gap-2 rounded-[var(--shape-control)] px-3 text-xs font-semibold text-[var(--text-primary)] no-underline transition-colors duration-[120ms] hover:bg-[var(--surface-inset)]"
            href={notification.href}
          >
            <ArrowRight aria-hidden size={18} weight="bold" />
            関連する活動を開く
          </Link>
        ) : (
          <span className="text-xs text-[var(--text-tertiary)]">関連する活動へのリンクはありません。</span>
        )}
        {!notification.read ? (
          <Button
            disabled={isPending}
            icon={<Check aria-hidden size={17} weight="bold" />}
            loading={isPending}
            onClick={() => onMarkRead(notification.id)}
            size="compact"
            variant="ghost"
          >
            既読にする
          </Button>
        ) : null}
      </div>
    </li>
  );
}

export function NotificationList({
  data,
  filter,
  onMarkRead,
  pendingId,
  runtimeConfig,
}: NotificationListProps) {
  const visibleNotifications = filterNotifications(data.notifications, filter);
  const timeFormatter = dateTimeFormatter(runtimeConfig.locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: runtimeConfig.timeZone,
  });
  if (visibleNotifications.length === 0) {
    return <EmptyState filter={filter} />;
  }
  return (
    <Card className="ui-notifications-inbox" padding="compact" tone="default">
      <ul className="m-0 grid list-none gap-2 p-0" aria-label="Moodleの通知">
        {visibleNotifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkRead={onMarkRead}
            pendingId={pendingId}
            timeFormatter={timeFormatter}
          />
        ))}
      </ul>
    </Card>
  );
}
