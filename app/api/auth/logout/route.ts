import { destroyMoodleSession, loadMoodleSession } from "@/lib/auth/server";
import { terminateMoodleUiSession } from "@/lib/moodle/ui-session";
import {
  authErrorResponse,
  noStoreResponse,
} from "@/lib/auth/http";
import { assertSameOriginMutation } from "@/lib/auth/same-origin";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOriginMutation(request);
    const session = await loadMoodleSession();
    if (session !== null) await terminateMoodleUiSession(session.site.siteUrl, session.uiSession);
    await destroyMoodleSession();
    return noStoreResponse({ ok: true });
  } catch (error) {
    if (error instanceof Error) {
      return authErrorResponse(error);
    }
    throw error;
  }
}
