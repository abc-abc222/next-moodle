import { assertSameOriginMutation, SameOriginError } from "../auth/same-origin";
import { MoodleAuthError, MoodlePermissionError } from "../moodle/errors";
import { AssignmentNotFoundError, MoodleCourseModulePathSchema } from "../moodle/queries/assignments";
import { createSafetyIdentifier, plainTextFromHtml } from "./context";
import { AiReviewInputSchema } from "./contracts";
import { AiProviderError } from "./provider";
import { AiRequestInProgressError, AiRequestLimitError } from "./rate-limit";
import { createAiReviewDependencies, loadAiAssignment } from "./runtime";

function failure(code: string, status: number): Response {
  return Response.json({ ok: false, error: { code } }, {
    headers: { "Cache-Control": "private, no-store" },
    status,
  });
}

function errorResponse(error: unknown): Response {
  if (error instanceof SameOriginError) return failure(error.code, 403);
  if (error instanceof MoodleAuthError) return failure("authentication_failed", 401);
  if (error instanceof MoodlePermissionError) return failure("access_forbidden", 403);
  if (error instanceof AssignmentNotFoundError) return failure(error.code, 404);
  if (error instanceof AiRequestLimitError || error instanceof AiRequestInProgressError) return failure(error.code, 429);
  if (error instanceof AiProviderError) return failure(error.code, error.code === "access_forbidden" ? 403 : 502);
  return failure("ai_unavailable", 503);
}

export async function handleAiReviewRequest(request: Request, cmidInput: string): Promise<Response> {
  let release: (() => void) | null = null;
  try {
    assertSameOriginMutation(request);
    if (request.headers.get("x-ai-consent") !== "1") return failure("ai_consent_required", 403);
    const dependencies = createAiReviewDependencies();
    if (dependencies.configurationError !== null || !dependencies.config.enabled || dependencies.provider === null) {
      return failure("ai_disabled", 503);
    }
    const cmid = MoodleCourseModulePathSchema.safeParse(cmidInput);
    if (!cmid.success) return failure("invalid_request", 400);
    const body = AiReviewInputSchema.safeParse(await request.json());
    if (!body.success) return failure("invalid_request", 400);
    const assignment = await loadAiAssignment(cmid.data);
    if (!assignment.onlineTextSupported) return failure("ai_assignment_unsupported", 409);
    const safetyIdentifier = createSafetyIdentifier({
      safetySecret: dependencies.config.safetySecret,
      siteUrl: assignment.siteUrl,
      userId: assignment.userId,
    });
    release = dependencies.limiter.acquire(safetyIdentifier);
    const result = await dependencies.provider.review({
      ...body.data,
      excerpt: plainTextFromHtml(body.data.excerpt),
      signal: AbortSignal.timeout(20_000),
      taskDescription: plainTextFromHtml(assignment.descriptionHtml),
      taskTitle: assignment.taskTitle,
    });
    return Response.json({ ok: true, result }, {
      headers: { "Cache-Control": "private, no-store" },
      status: 200,
    });
  } catch (error) {
    return errorResponse(error);
  } finally {
    release?.();
  }
}
