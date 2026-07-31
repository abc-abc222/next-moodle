import type { Metadata } from "next";

import { resolveMoodlePageFailure, StateNotice } from "@/components/app-shell/state-notice";
import { PageFrame, RouteHeader } from "@/components/app-shell/workspace-frame";
import { CourseList } from "@/components/courses/course-list";
import { requireMoodleSession } from "@/lib/auth/server";
import { readCourses } from "@/lib/moodle/queries/courses";
import { currentUnixSeconds } from "@/lib/moodle/now";
import { readAppRuntimeConfig } from "@/lib/app-config";
import { shouldUseHtmlDelivery, StudentHtmlScreen } from "@/components/student/student-html-screen";

export const metadata: Metadata = { title: "コース" };

export default async function CoursesPage() {
  const session = await requireMoodleSession();
  const config = readAppRuntimeConfig();
  if (session.manifest.features.courses !== "available") {
    return <StudentHtmlScreen description="受講中と今後のコースを確認します。" session={session} surface="courses" title="コース" />;
  }
  const result = await readCourses(session.userId, currentUnixSeconds());
  if (result.kind === "failure" && shouldUseHtmlDelivery(result.reason)) return <StudentHtmlScreen description="受講中と今後のコースを確認します。" session={session} surface="courses" title="コース" />;
  return (
    <PageFrame
      content={result.kind === "ready" ? (
        <CourseList canFavorite={session.manifest.features.favorites === "available"} config={config} courses={result.data} />
      ) : (
        <StateNotice reason={resolveMoodlePageFailure(result.reason)} retryHref="/courses" siteUrl={session.site.siteUrl} />
      )}
      header={<RouteHeader description="状態、期限、進捗を比較しながら、学習するコースを選べます。" eyebrow="コース索引" title="コース" />}
      mode="overview"
    />
  );
}
