import type { Metadata } from "next";

import { resolveMoodlePageFailure, StateNotice } from "@/components/app-shell/state-notice";
import { StudentAreaView } from "@/components/student/student-area-view";
import { shouldUseHtmlDelivery, StudentHtmlScreen } from "@/components/student/student-html-screen";
import { readAppRuntimeConfig } from "@/lib/app-config";
import { requireMoodleSession } from "@/lib/auth/server";
import { readGrades } from "@/lib/moodle/queries/student";

export const metadata: Metadata = { title: "成績" };

export default async function GradesPage() {
  const session = await requireMoodleSession();
  if (session.manifest.features.grades !== "available") return <StudentHtmlScreen description="コースごとの評価と総合点を確認します。" session={session} surface="grades" title="成績" />;
  const result = await readGrades(session.userId);
  if (result.kind === "failure" && shouldUseHtmlDelivery(result.reason)) return <StudentHtmlScreen description="コースごとの評価と総合点を確認します。" session={session} surface="grades" title="成績" />;
  return result.kind === "failure"
    ? <StateNotice reason={resolveMoodlePageFailure(result.reason)} retryHref="/grades" siteUrl={session.site.siteUrl} />
    : <StudentAreaView config={readAppRuntimeConfig()} data={result.data} description="コースごとの評価と総合点を確認します。" empty="表示できる成績はありません" title="成績" />;
}
