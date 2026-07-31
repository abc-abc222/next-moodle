import "server-only";

import { z } from "zod";

import { MoodlePageClient } from "./page-client";
import { MoodleClient } from "./client";
import { MOODLE_FUNCTIONS } from "./functions";
import { MoodleEnrolledCoursesResponseSchema } from "./dto";
import type { MoodlePageProjection } from "./page-parser";
import { parseMoodlePage } from "./page-parser";
import type { MoodleSession } from "./site";

export const StudentHtmlSurfaceSchema = z.enum([
  "badges",
  "calendar",
  "courses",
  "dashboard",
  "files",
  "grades",
  "messages",
  "notifications",
  "people",
  "plans",
  "profile",
  "profile-edit",
]);
export type StudentHtmlSurface = z.infer<typeof StudentHtmlSurfaceSchema>;

type StudentSurfaceRequest = Readonly<{
  path: string;
  search?: Readonly<Record<string, string | number>>;
}>;

async function requestForSurface(surface: StudentHtmlSurface, session: MoodleSession): Promise<StudentSurfaceRequest> {
  switch (surface) {
    case "badges": return { path: "badges/mybadges.php" };
    case "calendar": return { path: "calendar/view.php", search: { view: "upcoming" } };
    case "courses": return { path: "my/courses.php" };
    case "dashboard": return { path: "my/index.php" };
    case "files": return { path: "user/files.php" };
    case "grades": return { path: "grade/report/overview/index.php", search: { userid: session.userId } };
    case "messages": return { path: "message/index.php" };
    case "notifications": return { path: "message/index.php", search: { view: "notifications" } };
    case "people": {
      const client = new MoodleClient({ config: { baseUrl: session.site.siteUrl, service: session.service, timeoutMs: 10_000 }, token: session.token });
      const enrolled = await client.call(MOODLE_FUNCTIONS.enrolledCourses, { userid: session.userId }, MoodleEnrolledCoursesResponseSchema);
      const course = enrolled.data.find((candidate) => candidate.visible !== 0);
      if (course === undefined) return { path: "user/index.php", search: { id: 1 } };
      return { path: "user/index.php", search: { id: course.id } };
    }
    case "plans": return { path: "admin/tool/lp/plans.php", search: { userid: session.userId } };
    case "profile": return { path: "user/profile.php", search: { id: session.userId } };
    case "profile-edit": return { path: "user/edit.php", search: { id: session.userId, returnto: "profile" } };
  }
}

export async function readStudentHtmlScreen(
  session: MoodleSession,
  surface: StudentHtmlSurface,
): Promise<Readonly<{ client: MoodlePageClient; projection: MoodlePageProjection }>> {
  const request = await requestForSurface(surface, session);
  const client = new MoodlePageClient(session);
  const response = await client.get(request);
  return {
    client,
    projection: parseMoodlePage(response.html, {
      currentUrl: response.url,
      siteUrl: session.site.siteUrl,
    }),
  };
}
