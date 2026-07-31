import { z } from "zod";

import type { MoodleConfig } from "./config";
import { restEndpoint } from "./config";
import {
  MoodleFunctionError,
  MoodleResponseError,
  responseDiagnosticFromIssues,
} from "./errors";
import {
  isReadFunction,
  MoodleFunctionNameSchema,
} from "./functions";
import type { MoodleToken } from "./identifiers";
import { encodeMoodleParams, type MoodleParams } from "./params";
import {
  errorFromMoodleEnvelope,
  readMoodleJson,
  warningsFromMoodleResponse,
  type MoodleWarning,
} from "./response";
import { postMoodleForm } from "./transport";

export type MoodleCallResult<T> = {
  readonly data: T;
  readonly warnings: readonly MoodleWarning[];
};

type MoodleClientOptions = {
  readonly config: MoodleConfig;
  readonly token: MoodleToken;
  readonly availableFunctions?: readonly string[];
};

export class MoodleClient {
  readonly #config: MoodleConfig;
  readonly #token: MoodleToken;
  readonly #availableFunctions: ReadonlySet<string> | null;

  constructor(options: MoodleClientOptions) {
    this.#config = options.config;
    this.#token = options.token;
    this.#availableFunctions =
      options.availableFunctions === undefined
        ? null
        : new Set(options.availableFunctions);
  }

  async call<T>(
    functionName: string,
    params: MoodleParams,
    schema: z.ZodType<T>,
  ): Promise<MoodleCallResult<T>> {
    const parsedFunction = MoodleFunctionNameSchema.safeParse(functionName);
    if (!parsedFunction.success) {
      throw new MoodleFunctionError();
    }
    if (
      this.#availableFunctions !== null &&
      !this.#availableFunctions.has(parsedFunction.data)
    ) {
      throw new MoodleFunctionError();
    }

    const response = await postMoodleForm({
      url: restEndpoint(this.#config),
      body: encodeMoodleParams(this.#token, parsedFunction.data, params),
      timeoutMs: this.#config.timeoutMs,
      retryTransient: isReadFunction(parsedFunction.data),
    });
    const raw = await readMoodleJson(response);
    const moodleError = errorFromMoodleEnvelope(raw, parsedFunction.data);
    if (moodleError !== null) {
      throw moodleError;
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      throw new MoodleResponseError(responseDiagnosticFromIssues({
        functionName: parsedFunction.data,
        issues: parsed.error.issues,
        phase: "response_schema",
      }));
    }
    return {
      data: parsed.data,
      warnings: warningsFromMoodleResponse(raw, parsedFunction.data),
    };
  }
}
