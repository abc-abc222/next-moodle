"use client";

import { Bell, BellSlash, ChatCircle, Check, LockSimple, PaperPlaneTilt, PushPin } from "@phosphor-icons/react";
import ky from "ky";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Field, Notice, RichContent, Textarea } from "@/components/ui";
import type { ForumActivityData } from "@/lib/moodle/activities/forum";

export function ForumWorkspace({ cmid, data, locale, timeZone }: Readonly<{
  cmid: number;
  data: ForumActivityData;
  locale: string;
  timeZone: string;
}>) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const dateTime = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone });
  const selected = data.discussions.find((discussion) => discussion.discussion === data.selectedDiscussionId);
  const replyTarget = data.posts.find((post) => post.canReply) ?? data.posts[0];

  async function updateDiscussion(action: "read" | "subscribe", subscribed?: boolean): Promise<void> {
    if (pending || data.selectedDiscussionId === null) return;
    setPending(true);
    setError(false);
    const json = action === "subscribe"
      ? { action, discussionId: data.selectedDiscussionId, subscribed: subscribed ?? false }
      : { action, discussionId: data.selectedDiscussionId };
    const response = await ky.post(`/api/activities/${cmid}/forum`, { json, retry: 0, throwHttpErrors: false });
    setPending(false);
    if (!response.ok) {
      setError(true);
      return;
    }
    router.refresh();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>, action: "create" | "reply"): Promise<void> {
    event.preventDefault();
    if (pending) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const subject = form.get("subject");
    const message = form.get("message");
    if (typeof subject !== "string" || typeof message !== "string") return;
    setPending(true);
    setError(false);
    const json = action === "create"
      ? { action, subject, message }
      : { action, subject, message, discussionId: data.selectedDiscussionId, postId: replyTarget?.id };
    const response = await ky.post(`/api/activities/${cmid}/forum`, { json, retry: 0, throwHttpErrors: false });
    setPending(false);
    if (!response.ok) {
      setError(true);
      return;
    }
    formElement.reset();
    router.refresh();
  }

  return (
    <section className="ui-forum" aria-labelledby="forum-title">
      <header><div><span className="ui-kicker">Discussion</span><h2 id="forum-title">フォーラム</h2></div><span>{data.discussions.length}件</span></header>
      <div className="ui-forum-grid">
        <nav aria-label="ディスカッション">
          {data.discussions.length === 0 ? <p>ディスカッションはありません。</p> : data.discussions.map((discussion) => (
            <Link aria-current={discussion.discussion === data.selectedDiscussionId ? "page" : undefined} href={`?discussion=${discussion.discussion}`} key={discussion.discussion}>
              <span>{discussion.pinned ? <PushPin aria-label="固定" size={14} /> : null}{discussion.locked ? <LockSimple aria-label="ロック" size={14} /> : null}<strong>{discussion.subject}</strong></span>
              <small>{discussion.userfullname} · 返信 {discussion.numreplies} · 未読 {discussion.numunread}</small>
            </Link>
          ))}
        </nav>
        <div className="ui-forum-thread">
          {selected === undefined ? <Notice title="ディスカッションを選択" tone="info"><p>一覧から会話を開いてください。</p></Notice> : <>
            <div className="ui-forum-thread__title"><div><h3>{selected.subject}</h3><span>{selected.locked ? "返信不可" : `${selected.numreplies}件の返信`}</span></div><div>{data.operations.markRead && selected.numunread > 0 ? <Button disabled={pending} onClick={() => void updateDiscussion("read")} variant="ghost"><Check aria-hidden size={16} />既読にする</Button> : null}{data.operations.subscribe ? <Button disabled={pending} onClick={() => void updateDiscussion("subscribe", !selected.subscribed)} variant="ghost">{selected.subscribed ? <BellSlash aria-hidden size={16} /> : <Bell aria-hidden size={16} />}{selected.subscribed ? "購読解除" : "購読"}</Button> : null}</div></div>
            <ol>{data.posts.map((post) => <li data-unread={post.unread} key={post.id}><div><span className="ui-avatar" aria-hidden>{post.author.slice(0, 1)}</span><span><strong>{post.author}</strong><small>{post.created === 0 ? "" : dateTime.format(new Date(post.created * 1_000))}</small></span></div><h4>{post.subject}</h4><RichContent className="ui-rich-content" document={post.message} /></li>)}</ol>
            {data.operations.reply && selected.canreply && replyTarget !== undefined && !selected.locked ? <form className="ui-forum-composer" onSubmit={(event) => void submit(event, "reply")}><Field id="forum-reply-subject" label="件名" maxLength={200} name="subject" required value={`Re: ${selected.subject}`} readOnly /><Textarea id="forum-reply-message" label="返信" maxLength={20_000} name="message" required rows={4} /><Button disabled={pending} type="submit"><PaperPlaneTilt aria-hidden size={17} />{pending ? "送信中" : "返信を投稿"}</Button></form> : null}
          </>}
        </div>
      </div>
      {data.canCreate ? <details className="ui-forum-create"><summary><ChatCircle aria-hidden size={17} />新しいディスカッション</summary><form onSubmit={(event) => void submit(event, "create")}><Field id="forum-new-subject" label="件名" maxLength={200} name="subject" required /><Textarea id="forum-new-message" label="本文" maxLength={20_000} name="message" required rows={5} /><Button disabled={pending} type="submit">作成</Button></form></details> : null}
      <span className="ui-form-error" aria-live="polite">{error ? "投稿できませんでした。入力内容は保持されています。" : ""}</span>
    </section>
  );
}
