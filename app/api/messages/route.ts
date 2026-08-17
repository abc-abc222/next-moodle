import { z } from "zod";

import { SameOriginError, assertSameOriginMutation } from "@/lib/auth/same-origin";
import { createAuthenticatedMoodleClient, requireMoodleSession } from "@/lib/auth/server";
import { MOODLE_FUNCTIONS } from "@/lib/moodle/functions";
import { MoodleCourseIdSchema } from "@/lib/moodle/model";
import { withDirectMessageLock } from "@/lib/moodle/messages/direct-message-lock";
import { readTeacherRoleShortnames } from "@/lib/moodle/messages/teacher-config";
import { openTeacherRecipientKey } from "@/lib/moodle/messages/teacher-recipient";
import { readCourseMessageCandidates } from "@/lib/moodle/messages/teachers";
import { currentUnixSeconds } from "@/lib/moodle/now";
import { ConversationSchema } from "@/lib/moodle/student-dto";

export const runtime = "nodejs";

const InputSchema = z.object({
  body: z.string().trim().min(1).max(10_000),
  clientRequestId: z.uuid(),
  courseId: MoodleCourseIdSchema,
  recipientKey: z.string().min(20).max(2_048),
});
const SendResponseSchema = z.array(z.object({
  errormessage: z.string().nullish(),
  msgid: z.number().int().positive().optional(),
}));

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOriginMutation(request);
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (!Number.isFinite(contentLength) || contentLength > 24_000) return Response.json({ ok: false, error: { code: "request_too_large" } }, { status: 413 });
    const input = InputSchema.safeParse(await request.json());
    if (!input.success) return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    const secret = process.env.SESSION_PASSWORD;
    if (secret === undefined) return Response.json({ ok: false, error: { code: "configuration_error" } }, { status: 503 });
    const session = await requireMoodleSession();
    if (session.manifest.operations["message.sendDirect"] !== "available") return Response.json({ ok: false, error: { code: "configuration_error" } }, { status: 503 });
    const recipient = openTeacherRecipientKey({
      courseId: input.data.courseId,
      key: input.data.recipientKey,
      nowSeconds: currentUnixSeconds(),
      secret,
      siteUrl: session.site.siteUrl,
      viewerId: session.userId,
    });
    if (recipient === null) return Response.json({ ok: false, error: { code: "recipient_expired" } }, { status: 400 });
    const recipients = await readCourseMessageCandidates({
      courseId: input.data.courseId,
      roleShortnames: readTeacherRoleShortnames(),
      siteUrl: session.site.siteUrl,
      viewerId: session.userId,
    });
    if (recipients.kind === "failure") return Response.json({ ok: false, error: { code: recipients.reason } }, { status: recipients.reason === "permission" ? 403 : 503 });
    if (!recipients.data.some((candidate) => candidate.id === recipient.recipientId)) return Response.json({ ok: false, error: { code: "recipient_not_allowed" } }, { status: 403 });

    const result = await withDirectMessageLock(`${session.userId}:${input.data.clientRequestId}`, async () => {
      const client = await createAuthenticatedMoodleClient();
      const message = await client.call(MOODLE_FUNCTIONS.sendMessages, {
        "messages[0][touserid]": recipient.recipientId,
        "messages[0][text]": input.data.body,
        "messages[0][textformat]": 2,
      }, SendResponseSchema);
      const sent = message.data[0];
      if (sent?.msgid === undefined || (sent.errormessage ?? "") !== "") throw new Error("direct_message_rejected");
      const conversation = await client.call(MOODLE_FUNCTIONS.conversationBetweenUsers, {
        userid: session.userId,
        otheruserid: recipient.recipientId,
        includecontactrequests: 0,
        includeprivacyinfo: 0,
        memberlimit: 2,
        messagelimit: 1,
        messageoffset: 0,
        newestmessagesfirst: 1,
      }, ConversationSchema);
      return { conversationId: conversation.data.id, messageId: sent.msgid };
    });
    return Response.json({ ok: true, result });
  } catch (error) {
    if (error instanceof SameOriginError) return Response.json({ ok: false, error: { code: error.code } }, { status: 403 });
    if (error instanceof Error && error.message === "direct_message_rejected") return Response.json({ ok: false, error: { code: "message_rejected" } }, { status: 403 });
    return Response.json({ ok: false, error: { code: "message_send_failed" } }, { status: 502 });
  }
}
