import type { Metadata } from "next";

import { resolveMoodlePageFailure, StateNotice } from "@/components/app-shell/state-notice";
import { PageFrame, RouteHeader } from "@/components/app-shell/workspace-frame";
import { TeacherContactForm } from "@/components/messages/teacher-contact-form";
import { requireMoodleSession } from "@/lib/auth/server";
import { currentUnixSeconds } from "@/lib/moodle/now";
import { readCourses } from "@/lib/moodle/queries/courses";

export const metadata: Metadata = { title: "新しいメッセージ" };

export default async function NewTeacherMessagePage({ searchParams }: Readonly<{
  searchParams: Promise<{ courseId?: string | string[] }>;
}>) {
  const session = await requireMoodleSession();
  if (session.manifest.features.people !== "available" || session.manifest.operations["message.sendDirect"] !== "available") {
    return <PageFrame content={<StateNotice reason="capability" retryHref="/messages/new" siteUrl={session.site.siteUrl} />} header={<RouteHeader description="受講コースの先生や学生と個別メッセージを始めます。" eyebrow="新規メッセージ" title="新しいメッセージ" />} mode="focus" />;
  }
  const courses = await readCourses(session.userId, currentUnixSeconds());
  if (courses.kind === "failure") return <PageFrame content={<StateNotice reason={resolveMoodlePageFailure(courses.reason)} retryHref="/messages/new" siteUrl={session.site.siteUrl} />} header={<RouteHeader description="受講コースの先生や学生と個別メッセージを始めます。" eyebrow="新規メッセージ" title="新しいメッセージ" />} mode="focus" />;
  const courseIdParam = (await searchParams).courseId;
  const initialCourseId = typeof courseIdParam === "string" && /^\d+$/.test(courseIdParam)
    ? Number(courseIdParam)
    : null;
  const activeCourses = courses.data.reduce<Array<{ id: number; name: string; shortName: string }>>((result, course) => {
    if (course.classification === "active") result.push({ id: course.id, name: course.name, shortName: course.shortName });
    return result;
  }, []);
  return <TeacherContactForm courses={activeCourses} initialCourseId={initialCourseId} />;
}
