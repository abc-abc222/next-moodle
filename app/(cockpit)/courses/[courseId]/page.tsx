import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { resolveMoodlePageFailure, StateNotice } from "@/components/app-shell/state-notice";
import { CourseDetail } from "@/components/courses/course-detail";
import { requireMoodleSession } from "@/lib/auth/server";
import { MoodleCourseIdSchema } from "@/lib/moodle/model";
import { readCourseDetail } from "@/lib/moodle/queries/courses";
import { currentUnixSeconds } from "@/lib/moodle/now";
import { readAppRuntimeConfig } from "@/lib/app-config";

export const metadata: Metadata = { title: "コース詳細" };

type CoursePageProps = Readonly<{ params: Promise<{ courseId: string }> }>;

export default async function CoursePage({ params }: CoursePageProps) {
  const session = await requireMoodleSession();
  const config = readAppRuntimeConfig();
  const route = await params;
  const parsedCourseId = MoodleCourseIdSchema.safeParse(Number(route.courseId));
  if (!parsedCourseId.success) {
    notFound();
  }
  if (session.manifest.features.courses !== "available") {
    return <StateNotice reason="capability" retryHref="/courses" siteUrl={session.site.siteUrl} />;
  }
  const result = await readCourseDetail({
    courseId: parsedCourseId.data,
    manifest: session.manifest,
    nowSeconds: currentUnixSeconds(),
    siteUrl: session.site.siteUrl,
    userId: session.userId,
  });
  if (result.kind === "failure") {
    return (
      <StateNotice
        {...(result.diagnostic === undefined ? {} : { diagnostic: result.diagnostic })}
        reason={resolveMoodlePageFailure(result.reason)}
        retryHref={`/courses/${parsedCourseId.data}`}
        siteUrl={session.site.siteUrl}
      />
    );
  }
  if (result.data === null) {
    notFound();
  }
  return <CourseDetail config={config} data={result.data} />;
}
