import "server-only";

import { createAuthenticatedMoodleClient, requireMoodleSession } from "../auth/server";
import type { MoodleCourseModuleId } from "../moodle/identifiers";
import { currentUnixSeconds } from "../moodle/now";
import { moodleDocumentText } from "../moodle/html";
import { fetchAssignmentDetail } from "../moodle/queries/assignments.query";
import { AiConfigurationError, createAiRuntimeConfig, readAiRuntimeConfig, toAiAvailability, type AiAvailability } from "./config";
import { createAiConsentStorageKey } from "./context";
import { OpenAiCompatibleWritingProvider } from "./provider";
import { AiRateLimiter } from "./rate-limit";

const limiter = new AiRateLimiter();

export type AiAssignmentAuthorization = Readonly<{
  descriptionHtml: string;
  onlineTextSupported: boolean;
  siteUrl: string;
  taskTitle: string;
  userId: number;
}>;

export async function loadAiAssignment(cmid: MoodleCourseModuleId): Promise<AiAssignmentAuthorization> {
  const session = await requireMoodleSession();
  const detail = await fetchAssignmentDetail({
    client: await createAuthenticatedMoodleClient(),
    now: currentUnixSeconds(),
    session,
  }, cmid);
  const policy = detail.nativeSubmission;
  return {
    descriptionHtml: moodleDocumentText(detail.description),
    onlineTextSupported: policy.kind === "enabled" && (policy.mode === "online_text" || policy.mode === "mixed"),
    siteUrl: session.site.siteUrl,
    taskTitle: detail.name,
    userId: session.userId,
  };
}

export function createAiReviewDependencies(): Readonly<{
  configurationError: AiConfigurationError | null;
  config: ReturnType<typeof createAiRuntimeConfig>;
  limiter: AiRateLimiter;
  provider: OpenAiCompatibleWritingProvider | null;
}> {
  try {
    const config = readAiRuntimeConfig();
    const provider = config.enabled
      ? new OpenAiCompatibleWritingProvider({ apiKey: config.apiKey, baseUrl: config.baseUrl, model: config.model })
      : null;
    return { configurationError: null, config, limiter, provider };
  } catch (error) {
    if (!(error instanceof AiConfigurationError)) throw error;
    return { configurationError: error, config: createAiRuntimeConfig({ enabled: "false" }), limiter, provider: null };
  }
}

export type AiUiContext = Readonly<{ availability: AiAvailability; consentStorageKey: string }>;

export function createAiUiContext(input: Readonly<{ siteUrl: string; userId: number }>): AiUiContext {
  let availability: AiAvailability;
  try {
    availability = toAiAvailability(readAiRuntimeConfig());
  } catch (error) {
    if (!(error instanceof AiConfigurationError)) throw error;
    availability = { enabled: false, provider: "OpenAI compatible" };
  }
  return { availability, consentStorageKey: createAiConsentStorageKey(input) };
}
