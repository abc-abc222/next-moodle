import type { Metadata } from "next";

import { resolveMoodlePageFailure, StateNotice } from "@/components/app-shell/state-notice";
import { MessagesIndex } from "@/components/messages/messages-view";
import { shouldUseHtmlDelivery, StudentHtmlScreen } from "@/components/student/student-html-screen";
import { requireMoodleSession } from "@/lib/auth/server";
import { readConversations } from "@/lib/moodle/queries/student";

export const metadata: Metadata = { title: "メッセージ" };

export default async function MessagesPage() {
  const session = await requireMoodleSession();
  if (session.manifest.features.messages !== "available") return <StudentHtmlScreen description="会話を確認し、アプリ内から返信します。" session={session} surface="messages" title="メッセージ" />;
  const result = await readConversations(session.userId);
  if (result.kind === "failure" && shouldUseHtmlDelivery(result.reason)) return <StudentHtmlScreen description="会話を確認し、アプリ内から返信します。" session={session} surface="messages" title="メッセージ" />;
  return result.kind === "failure" ? <StateNotice reason={resolveMoodlePageFailure(result.reason)} retryHref="/messages" siteUrl={session.site.siteUrl} /> : <MessagesIndex conversations={result.data} />;
}
