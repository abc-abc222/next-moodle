import type { Metadata } from "next";

import { resolveMoodlePageFailure, StateNotice } from "@/components/app-shell/state-notice";
import { StudentAreaView } from "@/components/student/student-area-view";
import { shouldUseHtmlDelivery, StudentHtmlScreen } from "@/components/student/student-html-screen";
import { readAppRuntimeConfig } from "@/lib/app-config";
import { requireMoodleSession } from "@/lib/auth/server";
import { readPrivateFiles } from "@/lib/moodle/queries/student";

export const metadata: Metadata = { title: "プライベートファイル" };

export default async function FilesPage() {
  const session = await requireMoodleSession();
  if (session.manifest.features.privateFiles !== "available") return <StudentHtmlScreen description="自分専用のファイルを管理します。" session={session} surface="files" title="プライベートファイル" />;
  const result = await readPrivateFiles(session.userId, session.site.siteUrl);
  if (result.kind === "failure" && shouldUseHtmlDelivery(result.reason)) return <StudentHtmlScreen description="自分専用のファイルを管理します。" session={session} surface="files" title="プライベートファイル" />;
  return result.kind === "failure"
    ? <StateNotice reason={resolveMoodlePageFailure(result.reason)} retryHref="/files" siteUrl={session.site.siteUrl} />
    : <StudentAreaView config={readAppRuntimeConfig()} data={result.data} description="Moodleに保存した自分専用のファイルです。" empty="プライベートファイルはありません" title="プライベートファイル" />;
}
