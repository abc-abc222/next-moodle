"use client";

import { Bell, BellSlash, ChatCircle, Check, LockSimple, PaperPlaneTilt, PushPin } from "@phosphor-icons/react";
import ky from "ky";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button, EmptyState, Field, Notice, RichContent, StickyActionBar, Textarea } from "@/components/ui";
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
  const dateTime = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone }), [locale, timeZone]);
  const selected = data.discussions.find((discussion) => discussion.discussion === data.selectedDiscussionId);
  const replyTarget = data.posts.find((post) => post.canReply) ?? data.posts[0];

  async function updateDiscussion(action: "read" | "subscribe", subscribed?: boolean): Promise<void> {
    if (pending || data.selectedDiscussionId === null) return;
    setPending(true);
    setError(false);
    const json = action === "subscribe"
      ? { action, discussionId: data.selectedDiscussionId, subscribed: subscribed ?? false }
      : { action, discussionId: data.selectedDiscussionId };
    try {
      const response = await ky.post(`/api/activities/${cmid}/forum`, { json, retry: 0, throwHttpErrors: false });
      if (!response.ok) {
        setError(true);
        return;
      }
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
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
    try {
      const response = await ky.post(`/api/activities/${cmid}/forum`, { json, retry: 0, throwHttpErrors: false });
      if (!response.ok) {
        setError(true);
        return;
      }
      formElement.reset();
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="ui-forum grid gap-5" aria-labelledby="forum-title">
      <header className="flex flex-wrap items-end justify-between gap-4"><div className="grid gap-1"><span className="ui-kicker font-mono text-xs tracking-[.08em] text-[var(--text-tertiary)]">DISCUSSION</span><h2 className="m-0 text-xl font-semibold" id="forum-title">フォーラム</h2></div><span className="text-xs text-[var(--text-tertiary)]">{data.discussions.length}件</span></header>
      <div className="ui-forum-grid grid min-h-[26rem] overflow-hidden rounded-[var(--shape-card)] bg-[var(--surface-primary)] lg:grid-cols-[minmax(14rem,.8fr)_minmax(0,1.8fr)]">
        <nav className="min-w-0 bg-[var(--surface-secondary)]" aria-label="ディスカッション">
          {data.discussions.length === 0 ? <div className="p-3"><EmptyState title="ディスカッションはありません。" /></div> : data.discussions.map((discussion) => (
            <Link className="grid min-h-16 gap-1 border-b border-[var(--border-subtle)] px-4 py-3 text-[var(--text-secondary)] no-underline transition-colors duration-[120ms] hover:bg-[var(--surface-elevated)] aria-[current=page]:bg-[var(--surface-selected)] aria-[current=page]:text-[var(--text-primary)]" aria-current={discussion.discussion === data.selectedDiscussionId ? "page" : undefined} href={`?discussion=${discussion.discussion}`} key={discussion.discussion}>
              <span className="flex min-w-0 items-start gap-1.5">{discussion.pinned ? <PushPin className="mt-0.5 shrink-0" aria-label="固定" size={14} /> : null}{discussion.locked ? <LockSimple className="mt-0.5 shrink-0" aria-label="ロック" size={14} /> : null}<strong className="truncate">{discussion.subject}</strong></span>
              <small className="truncate text-xs text-[var(--text-tertiary)]">{discussion.userfullname} · 返信 {discussion.numreplies} · 未読 {discussion.numunread}</small>
            </Link>
          ))}
        </nav>
        <div className="ui-forum-thread min-w-0">
          {selected === undefined ? <Notice title="ディスカッションを選択" tone="info"><p>一覧から会話を開いてください。</p></Notice> : <>
            <div className="ui-forum-thread__title flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3"><div className="grid gap-0.5"><h3 className="m-0 text-lg font-semibold">{selected.subject}</h3><span className="text-xs text-[var(--text-tertiary)]">{selected.locked ? "返信不可" : `${selected.numreplies}件の返信`}</span></div><div className="flex flex-wrap gap-1">{data.operations.markRead && selected.numunread > 0 ? <Button disabled={pending} onClick={() => void updateDiscussion("read")} variant="ghost"><Check aria-hidden size={16} />既読にする</Button> : null}{data.operations.subscribe ? <Button disabled={pending} onClick={() => void updateDiscussion("subscribe", !selected.subscribed)} variant="ghost">{selected.subscribed ? <BellSlash aria-hidden size={16} /> : <Bell aria-hidden size={16} />}{selected.subscribed ? "購読解除" : "購読"}</Button> : null}</div></div>
            <ol className="m-0 grid list-none divide-y divide-[var(--border-subtle)] p-0">{data.posts.map((post) => <li className="grid gap-3 p-4 data-[unread=true]:shadow-[inset_3px_0_var(--accent-500)] sm:p-5" data-unread={post.unread} key={post.id}><div className="flex items-center gap-3"><span className="ui-avatar grid size-9 shrink-0 place-items-center rounded-full bg-[var(--surface-selected)] font-bold text-[var(--accent-400)]" aria-hidden>{post.author.slice(0, 1)}</span><span className="grid gap-0.5"><strong>{post.author}</strong><small className="text-xs text-[var(--text-tertiary)]">{post.created === 0 ? "" : dateTime.format(new Date(post.created * 1_000))}</small></span></div><h4 className="m-0 text-base font-semibold">{post.subject}</h4><RichContent document={post.message} /></li>)}</ol>
            {data.operations.reply && selected.canreply && replyTarget !== undefined && !selected.locked ? <form className="ui-forum-composer grid gap-4 bg-[var(--surface-inset)] p-4 sm:p-5" onSubmit={(event) => void submit(event, "reply")}><Field id="forum-reply-subject" label="件名" maxLength={200} name="subject" required value={`Re: ${selected.subject}`} readOnly /><Textarea id="forum-reply-message" label="返信" maxLength={20_000} name="message" required rows={4} /><StickyActionBar aria-label="返信操作"><Button disabled={pending} loading={pending} type="submit"><PaperPlaneTilt aria-hidden size={17} />返信を投稿</Button></StickyActionBar></form> : null}
          </>}
        </div>
      </div>
      {data.canCreate ? <details className="ui-forum-create rounded-[var(--shape-card)] bg-[var(--surface-primary)]"><summary className="flex min-h-14 cursor-pointer items-center gap-2 px-4 font-semibold sm:px-6"><ChatCircle aria-hidden size={17} />新しいディスカッション</summary><form className="grid gap-4 px-4 pt-2 pb-5 sm:px-6" onSubmit={(event) => void submit(event, "create")}><Field id="forum-new-subject" label="件名" maxLength={200} name="subject" required /><Textarea id="forum-new-message" label="本文" maxLength={20_000} name="message" required rows={5} /><StickyActionBar aria-label="ディスカッション操作"><Button disabled={pending} loading={pending} type="submit">作成</Button></StickyActionBar></form></details> : null}
      <span className="ui-form-error min-h-5 text-sm text-[var(--status-error)]" aria-live="polite">{error ? "投稿できませんでした。入力内容は保持されています。" : ""}</span>
    </section>
  );
}
