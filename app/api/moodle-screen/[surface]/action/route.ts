import { SameOriginError, assertSameOriginMutation } from "@/lib/auth/same-origin";
import { requireMoodleSession, saveMoodleSession } from "@/lib/auth/server";
import { MoodlePageError } from "@/lib/moodle/page-contracts";
import { GenericMoodleFormSubmissionSchema } from "@/lib/moodle/page-model";
import { materializeMoodleFormSubmission, parseMoodlePage } from "@/lib/moodle/page-parser";
import { readStudentHtmlScreen, StudentHtmlSurfaceSchema } from "@/lib/moodle/student-html-screen";

export const runtime = "nodejs";

function pageError(error: MoodlePageError): Response {
  const status = error.code === "reauth_required" ? 401 : error.code === "forbidden" ? 403 : error.code === "transient_failure" ? 503 : 409;
  return Response.json({ ok: false, result: { kind: error.code, message: error.code === "reauth_required" ? "再ログインが必要です。" : "画面を更新できませんでした。" } }, { status });
}

export async function POST(request: Request, context: Readonly<{ params: Promise<{ surface: string }> }>): Promise<Response> {
  try {
    assertSameOriginMutation(request);
    const surface = StudentHtmlSurfaceSchema.safeParse((await context.params).surface);
    const input = GenericMoodleFormSubmissionSchema.safeParse(await request.json());
    if (!surface.success || !input.success) return Response.json({ ok: false, result: { kind: "upstream_changed", message: "入力形式を確認してください。" } }, { status: 400 });
    const session = await requireMoodleSession();
    const { client, projection } = await readStudentHtmlScreen(session, surface.data);
    const materialized = materializeMoodleFormSubmission(projection, input.data);
    if (materialized.kind === "changed") return Response.json({ ok: false, result: { kind: "upstream_changed", message: "画面が更新されました。再読み込みしてください。" } }, { status: 409 });
    if (materialized.kind === "invalid") return Response.json({ ok: false, result: { kind: "validation_error", fieldErrors: materialized.fieldErrors, message: materialized.message } }, { status: 422 });
    const response = materialized.method === "post"
      ? await client.postAction(materialized.action, materialized.body)
      : await client.getAction(materialized.action, materialized.body);
    if (response.uiSession.cookieValue !== session.uiSession.cookieValue) await saveMoodleSession({ ...session, uiSession: response.uiSession });
    const next = parseMoodlePage(response.html, { currentUrl: response.url, siteUrl: session.site.siteUrl });
    const fieldErrors = Object.assign({}, ...next.screen.forms.map((form) => form.errors));
    if (Object.keys(fieldErrors).length > 0) return Response.json({ ok: false, result: { kind: "validation_error", fieldErrors, message: "入力内容を確認してください。" } }, { status: 422 });
    const errorNotice = next.screen.notices.find((notice) => notice.tone === "error");
    if (errorNotice !== undefined) return Response.json({ ok: false, result: { kind: "validation_error", fieldErrors: {}, message: errorNotice.message } }, { status: 422 });
    return Response.json({ ok: true, result: { kind: "success" } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SameOriginError) return Response.json({ ok: false, result: { kind: "forbidden", message: "送信元を確認できませんでした。" } }, { status: 403 });
    if (error instanceof MoodlePageError) return pageError(error);
    if (error instanceof Error) return Response.json({ ok: false, result: { kind: "transient_failure", message: "送信に失敗しました。入力内容は保持されています。" } }, { status: 502 });
    throw error;
  }
}
