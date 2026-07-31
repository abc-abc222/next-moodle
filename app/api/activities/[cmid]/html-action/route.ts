import { SameOriginError, assertSameOriginMutation } from "@/lib/auth/same-origin";
import { requireMoodleSession, saveMoodleSession } from "@/lib/auth/server";
import { MoodlePageClient } from "@/lib/moodle/page-client";
import { MoodlePageError } from "@/lib/moodle/page-contracts";
import { GenericMoodleFormSubmissionSchema } from "@/lib/moodle/page-model";
import { materializeMoodleFormSubmission, parseMoodlePage } from "@/lib/moodle/page-parser";
import { MoodleCourseModuleIdSchema } from "@/lib/moodle/identifiers";
import { readActivityWorkspace } from "@/lib/moodle/queries/activity";

export const runtime = "nodejs";

function pageErrorResponse(error: MoodlePageError): Response {
  const status = error.code === "reauth_required" ? 401
    : error.code === "forbidden" ? 403
      : error.code === "closed" ? 409
        : error.code === "transient_failure" ? 503 : 502;
  return Response.json({ ok: false, result: { kind: error.code, message: error.code === "reauth_required" ? "Moodleへの再ログインが必要です。" : "Moodleの画面を更新できませんでした。" } }, { status });
}

export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ cmid: string }> }>,
): Promise<Response> {
  try {
    assertSameOriginMutation(request);
    const cmid = MoodleCourseModuleIdSchema.safeParse(Number((await context.params).cmid));
    const input = GenericMoodleFormSubmissionSchema.safeParse(await request.json());
    if (!cmid.success || !input.success) return Response.json({ ok: false, result: { kind: "upstream_changed", message: "入力形式を確認してください。" } }, { status: 400 });
    const session = await requireMoodleSession();
    const activity = await readActivityWorkspace({ cmid: cmid.data, manifest: session.manifest, siteUrl: session.site.siteUrl, userId: session.userId });
    if (activity.kind !== "ready" || activity.data === null || activity.data.resolution.kind !== "html" || activity.data.htmlScreen === null) {
      return Response.json({ ok: false, result: { kind: "forbidden", message: "この活動にはHTML操作を使用できません。" } }, { status: 403 });
    }
    const materialized = materializeMoodleFormSubmission(activity.data.htmlScreen.projection, input.data);
    if (materialized.kind === "changed") return Response.json({ ok: false, result: { kind: "upstream_changed", message: "Moodle側の画面が更新されました。再読み込みしてください。" } }, { status: 409 });
    if (materialized.kind === "invalid") return Response.json({ ok: false, result: { kind: "validation_error", fieldErrors: materialized.fieldErrors, message: materialized.message } }, { status: 422 });

    const client = new MoodlePageClient(session, 20_000);
    const response = materialized.method === "post"
      ? await client.postAction(materialized.action, materialized.body)
      : await client.getAction(materialized.action, materialized.body);
    if (response.uiSession.cookieValue !== session.uiSession.cookieValue) {
      await saveMoodleSession({ ...session, uiSession: response.uiSession });
    }
    const projection = parseMoodlePage(response.html, { currentUrl: response.url, siteUrl: session.site.siteUrl });
    const fieldErrors = Object.assign({}, ...projection.screen.forms.map((form) => form.errors));
    if (Object.keys(fieldErrors).length > 0) {
      return Response.json({ ok: false, result: { kind: "validation_error", fieldErrors, message: "入力内容を確認してください。" } }, { status: 422 });
    }
    const errorNotice = projection.screen.notices.find((notice) => notice.tone === "error");
    if (errorNotice !== undefined) {
      return Response.json({ ok: false, result: { kind: "validation_error", fieldErrors: {}, message: errorNotice.message } }, { status: 422 });
    }
    return Response.json({ ok: true, result: { kind: "success", screen: projection.screen } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SameOriginError) return Response.json({ ok: false, result: { kind: "forbidden", message: "送信元を確認できませんでした。" } }, { status: 403 });
    if (error instanceof MoodlePageError) return pageErrorResponse(error);
    if (error instanceof Error) return Response.json({ ok: false, result: { kind: "transient_failure", message: "Moodleへの送信に失敗しました。入力内容は保持されています。" } }, { status: 502 });
    throw error;
  }
}
