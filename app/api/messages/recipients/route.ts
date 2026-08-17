import { MoodleCourseIdSchema } from "@/lib/moodle/model";
import { readTeacherRoleShortnames } from "@/lib/moodle/messages/teacher-config";
import { sealTeacherRecipientKey } from "@/lib/moodle/messages/teacher-recipient";
import { readCourseMessageCandidates } from "@/lib/moodle/messages/teachers";
import { currentUnixSeconds } from "@/lib/moodle/now";
import { requireMoodleSession } from "@/lib/auth/server";

export const runtime = "nodejs";

function matchesQuery(name: string, query: string): boolean {
  const normalizedQuery = query.trim().toLocaleLowerCase("ja-JP");
  return normalizedQuery === "" || name.toLocaleLowerCase("ja-JP").includes(normalizedQuery);
}

export async function GET(request: Request): Promise<Response> {
  try {
    const searchParams = new URL(request.url).searchParams;
    const courseId = MoodleCourseIdSchema.safeParse(Number(searchParams.get("courseId")));
    const kind = searchParams.get("kind") ?? "all";
    if (!courseId.success || !["all", "teacher", "student"].includes(kind)) {
      return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    }
    const secret = process.env.SESSION_PASSWORD;
    if (secret === undefined) return Response.json({ ok: false, error: { code: "configuration_error" } }, { status: 503 });
    const session = await requireMoodleSession();
    if (session.manifest.operations["message.sendDirect"] !== "available") {
      return Response.json({ ok: false, error: { code: "configuration_error" } }, { status: 503 });
    }
    const candidates = await readCourseMessageCandidates({
      courseId: courseId.data,
      roleShortnames: readTeacherRoleShortnames(),
      siteUrl: session.site.siteUrl,
      viewerId: session.userId,
    });
    if (candidates.kind === "failure") {
      return Response.json({ ok: false, error: { code: candidates.reason } }, { status: candidates.reason === "permission" ? 403 : 503 });
    }
    const query = searchParams.get("query") ?? "";
    const expiresAt = currentUnixSeconds() + 10 * 60;
    return Response.json({
      ok: true,
      result: candidates.data
        .filter((candidate) => kind === "all" || candidate.kind === kind)
        .filter((candidate) => matchesQuery(candidate.displayName, query))
        .map((candidate) => ({
          avatarUrl: candidate.avatarUrl,
          canMessage: true,
          displayName: candidate.displayName,
          kind: candidate.kind,
          recipientKey: sealTeacherRecipientKey({
            courseId: courseId.data,
            expiresAt,
            recipientId: candidate.id,
            secret,
            siteUrl: session.site.siteUrl,
            viewerId: session.userId,
          }),
          roles: candidate.roles,
        })),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ ok: false, error: { code: "recipient_lookup_failed" } }, { status: 502, headers: { "Cache-Control": "private, no-store" } });
  }
}
