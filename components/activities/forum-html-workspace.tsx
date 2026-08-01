"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { MoodleScreenForm } from "@/components/activities/html-activity-workspace";
import { Notice, RichContent } from "@/components/ui";
import { moodleDocumentText } from "@/lib/moodle/html";
import type { MoodleScreenModel } from "@/lib/moodle/page-model";

function emptyForumMessage(screen: MoodleScreenModel): string | null {
  const value = moodleDocumentText(screen.document);
  const matched = value.match(/(?:まだ新しい[^。]*投稿(?:されて)?いません。|[^。]*(?:投稿|ディスカッション)[^。]*(?:ありません|なし)。?)/i);
  return matched?.[0]?.trim() || null;
}

export function ForumHtmlWorkspace({ cmid, screen }: Readonly<{ cmid: number; screen: MoodleScreenModel }>) {
  const [currentScreen, setCurrentScreen] = useState(screen);
  const emptyMessage = useMemo(() => emptyForumMessage(currentScreen), [currentScreen]);
  return <section className="ui-forum-html" data-testid="html-forum-workspace">
    {currentScreen.notices.filter((notice) => emptyMessage === null || !/まだ新しい[^。]*投稿(?:されて)?いません。/i.test(notice.message)).map((notice, index) => <Notice key={`${notice.message}:${index}`} title="フォーラムからのお知らせ" tone={notice.tone}><p>{notice.message}</p></Notice>)}
    <section className="ui-forum-html__feed" aria-labelledby="forum-html-feed-title">
      <header><div><span className="ui-kicker">DISCUSSIONS</span><h2 id="forum-html-feed-title">投稿</h2></div></header>
      {emptyMessage === null ? <RichContent className="ui-rich-content ui-forum-html__document" document={currentScreen.document} /> : <Notice title="まだ新しい投稿はありません" tone="info"><p>{emptyMessage} 新しい投稿が公開されると、ここに時系列で表示されます。</p></Notice>}
    </section>
    {currentScreen.forms.length === 0 ? null : <details className="ui-forum-html__search"><summary><MagnifyingGlass aria-hidden size={18} />投稿を検索</summary>{currentScreen.forms.map((form) => <MoodleScreenForm actionEndpoint={`/api/activities/${cmid}/html-action`} form={form} key={`${form.id}:${form.revision}`} onScreenChange={setCurrentScreen} presentation="forum" />)}</details>}
  </section>;
}
