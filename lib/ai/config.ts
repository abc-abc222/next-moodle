import { z } from "zod";

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-5.4-mini";

const ModelSchema = z.string().trim().min(1).max(200);
const SafetySecretSchema = z.string().superRefine((value, context) => {
  if (new TextEncoder().encode(value).byteLength < 32) {
    context.addIssue({ code: "custom", message: "AI safety secret is too short" });
  }
});

function isLocalHttpUrl(value: string): boolean {
  const url = new URL(value);
  return url.protocol === "http:" && (
    url.hostname === "127.0.0.1" ||
    url.hostname === "localhost" ||
    url.hostname === "::1"
  );
}

const BaseUrlSchema = z.string().trim().min(1).max(2_000).transform((value, context) => {
  try {
    const url = new URL(value);
    if (url.username !== "" || url.password !== "" || (url.protocol !== "https:" && !isLocalHttpUrl(value))) {
      context.addIssue({ code: "custom", message: "AI base URL must use HTTPS or a local HTTP endpoint" });
      return z.NEVER;
    }
    const pathname = url.pathname.replace(/\/+$/, "");
    if (pathname !== "" && pathname !== "/v1") {
      context.addIssue({ code: "custom", message: "AI base URL must target the OpenAI-compatible /v1 endpoint" });
      return z.NEVER;
    }
    url.pathname = "/v1";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    context.addIssue({ code: "custom", message: "AI base URL is invalid" });
    return z.NEVER;
  }
});

const DisabledConfigSchema = z.object({
  enabled: z.literal(false),
  model: ModelSchema,
  privacyNoticeUrl: z.url().optional(),
});

const EnabledConfigSchema = z.object({
  apiKey: z.string().trim().max(1_024),
  baseUrl: BaseUrlSchema,
  enabled: z.literal(true),
  model: ModelSchema,
  privacyNoticeUrl: z.url().optional(),
  safetySecret: SafetySecretSchema,
});

export type AiRuntimeConfig = Readonly<z.infer<typeof DisabledConfigSchema> | z.infer<typeof EnabledConfigSchema>>;
export type AiAvailability = Readonly<{
  enabled: boolean;
  provider: "OpenAI compatible";
  privacyNoticeUrl?: string;
}>;

type AiConfigInput = Readonly<{
  apiKey?: string;
  baseUrl?: string;
  enabled?: string;
  model?: string;
  privacyNoticeUrl?: string;
  safetySecret?: string;
}>;

export class AiConfigurationError extends Error {
  override readonly name = "AiConfigurationError";
  readonly code = "ai_configuration_error";

  constructor() {
    super("AI assistance configuration is invalid.");
  }
}

export function createAiRuntimeConfig(input: AiConfigInput): AiRuntimeConfig {
  if (input.enabled !== undefined && input.enabled !== "true" && input.enabled !== "false") {
    throw new AiConfigurationError();
  }
  const enabled = input.enabled === "true";
  const base = {
    enabled,
    model: input.model ?? DEFAULT_MODEL,
    ...(input.privacyNoticeUrl === undefined ? {} : { privacyNoticeUrl: input.privacyNoticeUrl }),
  };
  const parsed = enabled
    ? EnabledConfigSchema.safeParse({
        ...base,
        apiKey: input.apiKey ?? "",
        baseUrl: input.baseUrl ?? DEFAULT_BASE_URL,
        safetySecret: input.safetySecret,
      })
    : DisabledConfigSchema.safeParse(base);
  if (!parsed.success) throw new AiConfigurationError();
  return parsed.data;
}

export function readAiRuntimeConfig(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): AiRuntimeConfig {
  return createAiRuntimeConfig({
    ...(environment.AI_API_KEY === undefined ? {} : { apiKey: environment.AI_API_KEY }),
    ...(environment.AI_BASE_URL === undefined ? {} : { baseUrl: environment.AI_BASE_URL }),
    ...(environment.AI_ASSIST_ENABLED === undefined ? {} : { enabled: environment.AI_ASSIST_ENABLED }),
    ...(environment.AI_MODEL === undefined ? {} : { model: environment.AI_MODEL }),
    ...(environment.AI_PRIVACY_NOTICE_URL === undefined ? {} : { privacyNoticeUrl: environment.AI_PRIVACY_NOTICE_URL }),
    ...(environment.AI_SAFETY_SECRET === undefined ? {} : { safetySecret: environment.AI_SAFETY_SECRET }),
  });
}

export function toAiAvailability(config: AiRuntimeConfig): AiAvailability {
  return {
    enabled: config.enabled,
    provider: "OpenAI compatible",
    ...(config.privacyNoticeUrl === undefined ? {} : { privacyNoticeUrl: config.privacyNoticeUrl }),
  };
}
