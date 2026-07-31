import {
  authenticateWithMoodle,
  readMoodleConfig,
} from "@/lib/moodle/server";
import {
  createMoodleSession,
  saveMoodleSession,
} from "@/lib/auth/server";
import {
  authErrorResponse,
  noStoreResponse,
  readLoginCredentials,
} from "@/lib/auth/http";
import { assertSameOriginMutation } from "@/lib/auth/same-origin";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOriginMutation(request);
    const credentials = await readLoginCredentials(request);
    const login = await authenticateWithMoodle(
      readMoodleConfig(),
      credentials,
    );
    await saveMoodleSession(createMoodleSession(login));
    return noStoreResponse({ ok: true });
  } catch (error) {
    if (error instanceof Error) {
      return authErrorResponse(error);
    }
    throw error;
  }
}
