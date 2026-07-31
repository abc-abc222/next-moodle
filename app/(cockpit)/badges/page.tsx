import type { Metadata } from "next";

import { resolveMoodlePageFailure, StateNotice } from "@/components/app-shell/state-notice";
import { StudentAreaView } from "@/components/student/student-area-view";
import { shouldUseHtmlDelivery, StudentHtmlScreen } from "@/components/student/student-html-screen";
import { readAppRuntimeConfig } from "@/lib/app-config";
import { requireMoodleSession } from "@/lib/auth/server";
import { readBadges } from "@/lib/moodle/queries/student";

export const metadata: Metadata = { title: "バッジ" };

export default async function BadgesPage() {
  const session = await requireMoodleSession();
  if (session.manifest.features.badges !== "available") return <StudentHtmlScreen description="学習成果として発行されたバッジを確認します。" session={session} surface="badges" title="バッジ" />;
  const result = await readBadges(session.userId);
  if (result.kind === "failure" && shouldUseHtmlDelivery(result.reason)) return <StudentHtmlScreen description="学習成果として発行されたバッジを確認します。" session={session} surface="badges" title="バッジ" />;
  return result.kind === "failure"
    ? <StateNotice reason={resolveMoodlePageFailure(result.reason)} retryHref="/badges" siteUrl={session.site.siteUrl} />
    : <StudentAreaView config={readAppRuntimeConfig()} data={result.data} description="学習成果として発行されたバッジを確認します。" empty="取得済みのバッジはありません" title="バッジ" />;
}
