import type { Metadata } from "next";

import { resolveMoodlePageFailure, StateNotice } from "@/components/app-shell/state-notice";
import { StudentAreaView } from "@/components/student/student-area-view";
import { shouldUseHtmlDelivery, StudentHtmlScreen } from "@/components/student/student-html-screen";
import Link from "next/link";
import { readAppRuntimeConfig } from "@/lib/app-config";
import { requireMoodleSession } from "@/lib/auth/server";
import { readProfile } from "@/lib/moodle/queries/student";

export const metadata: Metadata = { title: "プロフィール" };

export default async function ProfilePage() {
  const session = await requireMoodleSession();
  if (session.manifest.features.profile !== "available") {
    return <StudentHtmlScreen description="アカウントと学習情報を確認します。" session={session} surface="profile" title="プロフィール" />;
  }
  const result = await readProfile(session.userId);
  if (result.kind === "failure" && shouldUseHtmlDelivery(result.reason)) return <StudentHtmlScreen description="アカウントと学習情報を確認します。" session={session} surface="profile" title="プロフィール" />;
  return result.kind === "failure"
    ? <StateNotice {...(result.diagnostic === undefined ? {} : { diagnostic: result.diagnostic })} reason={resolveMoodlePageFailure(result.reason)} retryHref="/profile" siteUrl={session.site.siteUrl} />
    : <StudentAreaView actions={<Link className="ui-app-action-link" href="/profile/edit">プロフィールを編集</Link>} config={readAppRuntimeConfig()} data={result.data} description="Moodleに登録されているプロフィールを確認します。" empty="プロフィール情報はありません" title="プロフィール" />;
}
