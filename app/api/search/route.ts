import { z } from "zod";

import { createAuthenticatedMoodleClient, requireMoodleSession } from "@/lib/auth/server";
import { MoodleCourseSectionsResponseSchema, MoodleEnrolledCoursesResponseSchema } from "@/lib/moodle/dto";
import { MOODLE_FUNCTIONS } from "@/lib/moodle/functions";
import { ConversationsSchema } from "@/lib/moodle/student-dto";
import { readPrivateFiles } from "@/lib/moodle/queries/student";
import { safeMoodleDestination } from "@/lib/moodle/urls";

export const runtime = "nodejs";

const QuerySchema = z.string().trim().min(2).max(2_048);

function normalized(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("ja");
}

export async function GET(request: Request): Promise<Response> {
  try {
    const query = QuerySchema.safeParse(new URL(request.url).searchParams.get("q") ?? "");
    if (!query.success) return Response.json({ results: [] });
    const needle = normalized(query.data);
    const session = await requireMoodleSession();
    const directHref = safeMoodleDestination(query.data, session.site.siteUrl);
    if (directHref !== null) {
      return Response.json({
        results: [{
          href: directHref,
          keywords: [query.data, "Moodle URL", "活動", "コース"],
          kind: "activity",
          label: directHref.startsWith("/assignments/") ? "課題を開く" : "Moodleの活動を開く",
        }],
      }, { headers: { "Cache-Control": "private, no-store" } });
    }
    const client = await createAuthenticatedMoodleClient();
    const courses = await client.call(MOODLE_FUNCTIONS.enrolledCourses, { userid: session.userId }, MoodleEnrolledCoursesResponseSchema);
    const contents = await Promise.all(courses.data.slice(0, 20).map(async (course) => ({
      course,
      sections: (await client.call(MOODLE_FUNCTIONS.courseContents, { courseid: course.id }, MoodleCourseSectionsResponseSchema)).data,
    })));
    const activities = contents.flatMap(({ course, sections }) => sections.flatMap((section) => section.modules.flatMap((module) => {
      if (!normalized(`${module.name} ${module.modname} ${course.fullname} ${course.shortname}`).includes(needle)) return [];
      return [{
        href: module.modname === "assign" ? `/assignments/${module.id}` : `/activities/${module.id}`,
        keywords: [course.fullname, course.shortname, section.name, module.modname],
        kind: "activity" as const,
        label: module.name,
      }];
    })));
    const conversationResults = session.manifest.features.messages === "available"
      ? await client.call(MOODLE_FUNCTIONS.conversations, { userid: session.userId, limitfrom: 0, limitnum: 50 }, ConversationsSchema)
      : null;
    const conversations = (conversationResults?.data.conversations ?? []).flatMap((conversation) =>
      normalized(conversation.name).includes(needle) ? [{
        href: `/messages/${conversation.id}`,
        keywords: conversation.members.map((member) => member.fullname),
        kind: "message" as const,
        label: conversation.name,
      }] : []
    );
    const privateFiles = session.manifest.features.privateFiles === "available"
      ? await readPrivateFiles(session.userId, session.site.siteUrl)
      : null;
    const files = privateFiles?.kind === "ready"
      ? privateFiles.data.rows.flatMap((file) => normalized(`${file.title} ${file.meta}`).includes(needle) ? [{
        href: "/files",
        keywords: [file.meta, "プライベートファイル"],
        kind: "file" as const,
        label: file.title,
      }] : [])
      : [];
    return Response.json({ results: [...activities, ...conversations, ...files].slice(0, 20) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof Error) return Response.json({ results: [] }, { status: 502, headers: { "Cache-Control": "private, no-store" } });
    throw error;
  }
}
