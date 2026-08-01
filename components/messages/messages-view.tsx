import {
  ChatCircleDots,
  Info,
  PencilSimpleLine,
} from "@phosphor-icons/react/dist/ssr";

import { InspectorSheet } from "@/components/app-shell/inspector-sheet";
import { ContextPanel } from "@/components/app-shell/context-panel";
import { SharedTransition, TransitionLink } from "@/components/app-shell/transitions";
import { PageFrame, RouteHeader } from "@/components/app-shell/workspace-frame";
import { Badge, Notice } from "@/components/ui";
import type { AppRuntimeConfig } from "@/lib/app-config";
import { dateTimeFormatter } from "@/lib/date-time";
import type { ConversationDetail, ConversationListItem } from "@/lib/moodle/queries/student";
import { ConversationScrollRegion } from "./conversation-scroll-region";
import { MessageComposer } from "./message-composer";
import "./messages.css";

function ConversationList({ conversations, selectedId }: Readonly<{
  conversations: readonly ConversationListItem[];
  selectedId?: number | undefined;
}>) {
  return (
    <nav aria-label="会話一覧" className="ui-conversation-index">
      {conversations.map((conversation) => (
        <TransitionLink aria-current={selectedId === conversation.id ? "page" : undefined} href={`/messages/${conversation.id}`} intent="drill-in" key={conversation.id}>
          <span className="ui-conversation-index__mark"><ChatCircleDots aria-hidden size={18} /></span>
          <span>
            {selectedId === conversation.id ? <strong>{conversation.name}</strong> : <SharedTransition identifier={conversation.id} kind="conversation"><strong>{conversation.name}</strong></SharedTransition>}
            <small>{conversation.preview}</small>
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
      mobileAlwaysOpen
      storageKey="messages"
      title={<span className="ui-conversation-context-title">会話<TransitionLink aria-label="先生へ新規連絡" className="ui-messages-new" href="/messages/new" intent="drill-in"><PencilSimpleLine aria-hidden size={18} /></TransitionLink></span>}
    >
      {conversations.length === 0 ? (
        <div className="ui-pane-body"><Notice title="会話はありません" tone="info"><p>新規連絡から担当教員へメッセージを送れます。</p></Notice></div>
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
  return <time dateTime={date.toISOString()}>{format.format(date)}</time>;
}

export function MessagesIndex({ conversations }: Readonly<{ conversations: readonly ConversationListItem[] }>) {
  return (
    <PageFrame
      className="ui-messages-index-frame"
      content={(
        <div className="ui-messages-placeholder">
          <ChatCircleDots aria-hidden size={34} />
          <h2>会話を選択</h2>
          <p>一覧からスレッドを開くか、担当教員へ新しい連絡を作成してください。</p>
          <TransitionLink className="ui-app-action-link" href="/messages/new" intent="drill-in"><PencilSimpleLine aria-hidden size={17} />先生へ連絡</TransitionLink>
        </div>
      )}
      context={<ConversationContext conversations={conversations} />}
      header={<RouteHeader description="授業に関する連絡と返信を、会話ごとに確認します。" eyebrow="COMMUNICATION" title="メッセージ" />}
      mode="conversation"
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
    <div className="ui-message-participants">
      <ul>{conversation.members.map((member) => <li key={member}>{member}</li>)}</ul>
      <TransitionLink className="ui-app-action-link" href="/people" intent="switch">参加者一覧</TransitionLink>
    </div>
  );

  return (
    <PageFrame
      className="ui-message-thread-frame"
      content={(
        <section aria-label={`${conversation.name}の会話履歴`} className="ui-message-thread">
          <ConversationScrollRegion key={conversation.id} messageCount={conversation.messages.length}>
            <ol>
              {conversation.messages.map((message) => (
                <li data-own={message.fromCurrentUser ? "true" : undefined} key={message.id}>
                  <p>{message.text}</p>
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
    />
  );
}
