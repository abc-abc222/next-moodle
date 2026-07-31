import { z } from "zod";

import { MoodleConfigurationError, MoodleInputError } from "./errors";

export const MOODLE_TIMEOUT_MS = 10_000;
export const DEFAULT_MOODLE_SERVICE = "moodle_mobile_app";

const MoodleBaseUrlSchema = z
  .url()
  .superRefine((value, context) => {
    const url = new URL(value);
    const localHttp =
      url.protocol === "http:" &&
      (url.hostname === "127.0.0.1" || url.hostname === "localhost");
    if (url.protocol !== "https:" && !localHttp) {
      context.addIssue({ code: "custom", message: "HTTPS is required" });
    }
    if (url.username !== "" || url.password !== "") {
      context.addIssue({ code: "custom", message: "Credentials are forbidden" });
    }
    if (url.search !== "" || url.hash !== "") {
      context.addIssue({ code: "custom", message: "Query and fragment are forbidden" });
    }
  })
  .transform((value) => {
    const url = new URL(value);
    url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString().replace(/\/$/, "");
  });

export const MoodleServiceSchema = z.string().trim().min(1).max(128).regex(/^[a-z0-9_]+$/);

const MoodleConfigInputSchema = z.object({
  baseUrl: MoodleBaseUrlSchema,
  service: MoodleServiceSchema.default(DEFAULT_MOODLE_SERVICE),
  timeoutMs: z.number().int().positive().max(MOODLE_TIMEOUT_MS).default(MOODLE_TIMEOUT_MS),
});

export type MoodleConfig = Readonly<z.infer<typeof MoodleConfigInputSchema>>;

export function createMoodleConfig(input: {
  readonly baseUrl: string;
  readonly service?: string;
  readonly timeoutMs?: number;
}): MoodleConfig {
  const parsed = MoodleConfigInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new MoodleConfigurationError();
  }
  return parsed.data;
}

export function readMoodleConfig(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): MoodleConfig {
  const baseUrl = environment.MOODLE_BASE_URL;
  if (baseUrl === undefined) {
    throw new MoodleConfigurationError();
  }
  return createMoodleConfig({
    baseUrl,
    service: environment.MOODLE_SERVICE ?? DEFAULT_MOODLE_SERVICE,
    timeoutMs: MOODLE_TIMEOUT_MS,
  });
}

function endpoint(config: MoodleConfig, path: string): URL {
  const base = new URL(`${config.baseUrl}/`);
  return new URL(path, base);
}

export function tokenEndpoint(config: MoodleConfig): URL {
  return endpoint(config, "login/token.php");
}

export function restEndpoint(config: MoodleConfig): URL {
  return endpoint(config, "webservice/rest/server.php");
}

export function uploadEndpoint(config: MoodleConfig): URL {
  return endpoint(config, "webservice/upload.php");
}

export function pluginFileEndpoint(
  config: MoodleConfig,
  pathname: string,
): URL {
  const path = pathname.replace(/^\/+/, "");
  if (!path.startsWith("webservice/pluginfile.php/")) {
    throw new MoodleInputError();
  }
  const url = endpoint(config, path);
  const basePath = new URL(`${config.baseUrl}/`).pathname;
  if (!url.pathname.startsWith(`${basePath}webservice/pluginfile.php/`)) {
    throw new MoodleInputError();
  }
  return url;
}
