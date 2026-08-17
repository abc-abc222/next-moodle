import {
  ChatCircleDots,
  Info,
  PencilSimpleLine,
} from "@phosphor-icons/react/dist/ssr";

import { InspectorSheet } from "@/components/app-shell/inspector-sheet";
import { ContextPanel } from "@/components/app-shell/context-panel";
import { SharedTransition, TransitionLink } from "@/components/app-shell/transitions";
import { PageFrame, RouteHeader } from "@/components/app-shell/workspace-frame";
import { Badge, EmptyState } from "@/components/ui";
import type { AppRuntimeConfig } from "@/lib/app-config";
import { dateTimeFormatter } from "@/lib/date-time";
import type { ConversationDetail, ConversationListItem } from "@/lib/moodle/queries/student";
import { ConversationScrollRegion } from "./conversation-scroll-region";
import { MessageComposer } from "./message-composer";

function ConversationList({ conversations, selectedId }: Readonly<{
  conversations: readonly ConversationListItem[];
  selectedId?: number | undefined;
}>) {
  return (
    <nav aria-label="会話一覧" className="ui-conversation-index grid w-full min-w-0 max-w-full divide-y divide-[var(--border-subtle)]">
      {conversations.map((conversation) => (
        <TransitionLink aria-current={selectedId === conversation.id ? "page" : undefined} className="relative grid min-h-[4.75rem] min-w-0 max-w-full grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-[var(--text-primary)] no-underline transition-colors duration-[120ms] hover:bg-[var(--surface-elevated)] aria-[current=page]:bg-[var(--surface-selected)]" href={`/messages/${conversation.id}`} intent="drill-in" key={conversation.id}>
          {selectedId === conversation.id ? <span aria-hidden className="absolute inset-y-3 left-0 w-[3px] rounded-r bg-[var(--accent-500)]" /> : null}
          <span className="ui-conversation-index__mark grid size-10 shrink-0 place-items-center overflow-hidden rounded-[var(--shape-control)] bg-[var(--surface-inset)] text-[var(--accent-400)]" data-testid="conversation-icon"><ChatCircleDots aria-hidden className="block size-[1.125rem] shrink-0" size={18} /></span>
          <span className="grid min-w-0">
            {selectedId === conversation.id ? <strong className="truncate">{conversation.name}</strong> : <SharedTransition identifier={conversation.id} kind="conversation"><strong className="block truncate">{conversation.name}</strong></SharedTransition>}
            <small className="truncate text-xs text-[var(--text-tertiary)]">{conversation.preview}</small>
          </span>
          {conversation.unreadCount === 0 ? null : <Badge tone="accent">{conversation.unreadCount}</Badge>}
        </TransitionLink>
      ))}
    </nav>
  );
}

function ConversationContext({ conversations, selectedId }: Readonly<{
  conversations: readonly ConversationListItem[];
  selectedId?: number | undefined;
}>) {
  return (
    <ContextPanel
      count={conversations.length}
      storageKey="messages"
      title={<span className="ui-conversation-context-title flex min-w-0 items-center gap-2">会話<TransitionLink aria-label="新しいメッセージ" className="ui-messages-new grid size-11 shrink-0 place-items-center rounded-[var(--shape-control)] text-[var(--accent-400)] hover:bg-[var(--surface-elevated)]" href="/messages/new" intent="drill-in"><PencilSimpleLine aria-hidden size={18} /></TransitionLink></span>}
    >
      {conversations.length === 0 ? (
        <div className="ui-pane-body p-3"><EmptyState icon={<ChatCircleDots aria-hidden size={20} />} title="会話はありません">新しいメッセージから先生や学生と会話を始められます。</EmptyState></div>
      ) : <ConversationList conversations={conversations} selectedId={selectedId} />}
    </ContextPanel>
  );
}

function MessageTime({ format, time }: Readonly<{ format: Intl.DateTimeFormat; time: number }>) {
  // PHP accepts a broad integer range for Moodle timestamps. Do not let a
  // malformed upstream value make a whole conversation unrenderable in JS.
  if (!Number.isSafeInteger(time) || time <= 0 || time > 8_640_000_000_000) return null;
  const date = new Date(time * 1_000);
  if (Number.isNaN(date.valueOf())) return null;
  return <time className="mt-2 block text-right font-mono text-xs text-[var(--text-tertiary)]" dateTime={date.toISOString()}>{format.format(date)}</time>;
}

export function MessagesIndex({ conversations }: Readonly<{ conversations: readonly ConversationListItem[] }>) {
  return (
    <PageFrame
      className="ui-messages-index-frame"
      content={(
        <EmptyState className="mx-auto min-h-[22rem] max-w-xl" action={<TransitionLink className="ui-app-action-link" href="/messages/new" intent="drill-in"><PencilSimpleLine aria-hidden size={17} />新しいメッセージ</TransitionLink>} icon={<ChatCircleDots aria-hidden size={26} />} title="会話を選択">一覧からスレッドを開くか、先生や学生との新しい会話を作成してください。</EmptyState>
      )}
      context={<ConversationContext conversations={conversations} />}
      header={<RouteHeader description="授業に関する連絡と返信を、会話ごとに確認します。" eyebrow="COMMUNICATION" title="メッセージ" />}
      mobileView="context"
      mode="conversation"
      width="full"
    />
  );
}

export function ConversationView({ config, conversation, conversations }: Readonly<{
  config: AppRuntimeConfig;
  conversation: ConversationDetail;
  conversations: readonly ConversationListItem[];
}>) {
  const format = dateTimeFormatter(config.locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: config.timeZone,
  });
  const participantDetails = (
    <div className="ui-message-participants grid gap-5">
      <ul className="m-0 grid list-none divide-y divide-[var(--border-subtle)] p-0">{conversation.members.map((member) => <li className="flex min-h-11 items-center" key={member}>{member}</li>)}</ul>
      <TransitionLink className="ui-app-action-link" href="/people" intent="switch">参加者一覧</TransitionLink>
    </div>
  );

  return (
    <PageFrame
      className="ui-message-thread-frame"
      content={(
        <section aria-label={`${conversation.name}の会話履歴`} className="ui-message-thread grid h-full min-h-0 w-full min-w-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden bg-[color-mix(in_srgb,var(--surface-primary)_88%,var(--surface-canvas))]">
          <ConversationScrollRegion key={conversation.id} messageCount={conversation.messages.length}>
            <ol className="m-0 grid min-h-full list-none content-end gap-3 p-4 sm:p-6 lg:p-8">
              {conversation.messages.map((message) => (
                <li className="w-[min(36rem,84%)] rounded-[var(--shape-card)] bg-[var(--surface-elevated)] px-4 py-3 shadow-[var(--shadow-surface)] data-[own=true]:justify-self-end data-[own=true]:bg-[var(--surface-selected)] max-sm:w-[92%]" data-own={message.fromCurrentUser ? "true" : undefined} key={message.id}>
                  <p className="m-0 whitespace-pre-wrap break-words leading-6">{message.text}</p>
                  <MessageTime format={format} time={message.time} />
                </li>
              ))}
            </ol>
          </ConversationScrollRegion>
          <MessageComposer conversationId={conversation.id} />
        </section>
      )}
      context={<ConversationContext conversations={conversations} selectedId={conversation.id} />}
      header={(
        <RouteHeader
          actions={<InspectorSheet label={<><Info aria-hidden size={17} />参加者</>} title="参加者">{participantDetails}</InspectorSheet>}
          description={conversation.members.join(" / ")}
          eyebrow="THREAD"
          shared={{ identifier: conversation.id, kind: "conversation" }}
          title={conversation.name}
        />
      )}
      mode="conversation"
      width="full"
    />
  );
}
