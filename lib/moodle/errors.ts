export const MOODLE_ERROR_CODES = {
  authentication: "authentication_failed",
  functionUnavailable: "function_unavailable",
  invalidInput: "invalid_request",
  permissionDenied: "permission_denied",
  outage: "moodle_unavailable",
  invalidResponse: "invalid_response",
  configuration: "configuration_error",
} as const;

export type MoodleErrorCode =
  (typeof MOODLE_ERROR_CODES)[keyof typeof MOODLE_ERROR_CODES];

export const MOODLE_DIAGNOSTIC_PHASES = [
  "exception",
  "json",
  "response_schema",
  "warning_schema",
] as const;
export type MoodleDiagnosticPhase = (typeof MOODLE_DIAGNOSTIC_PHASES)[number];

export type MoodleResponseDiagnostic = Readonly<{
  functionName?: string;
  issues: readonly Readonly<{
    code: string;
    expected?: string;
    path: string;
    received?: string;
  }>[];
  occurredAt: number;
  phase: MoodleDiagnosticPhase;
}>;

type ZodIssueShape = Readonly<{
  code: string;
  expected?: unknown;
  path: readonly PropertyKey[];
  received?: unknown;
}>;

/** Keeps only schema structure; no Moodle values, tokens, or error messages. */
export function responseDiagnosticFromIssues(
  input: Readonly<{
    functionName?: string;
    issues: readonly ZodIssueShape[];
    phase: MoodleDiagnosticPhase;
  }>,
): MoodleResponseDiagnostic {
  return {
    ...(input.functionName === undefined ? {} : { functionName: input.functionName }),
    issues: input.issues.slice(0, 10).map((issue) => ({
      code: issue.code,
      ...(typeof issue.expected === "string" ? { expected: issue.expected } : {}),
      path: issue.path.map((part) => typeof part === "number" ? `[${part}]` : String(part)).join(".") || "response",
      ...(typeof issue.received === "string" ? { received: issue.received } : {}),
    })),
    occurredAt: Date.now(),
    phase: input.phase,
  };
}

export abstract class MoodleError extends Error {
  abstract override readonly name: string;

  protected constructor(
    readonly code: MoodleErrorCode,
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

export class MoodleAuthError extends MoodleError {
  override readonly name = "MoodleAuthError";

  constructor() {
    super(
      MOODLE_ERROR_CODES.authentication,
      "Moodle authentication failed.",
      false,
    );
  }
}

export class MoodleFunctionError extends MoodleError {
  override readonly name = "MoodleFunctionError";

  constructor() {
    super(
      MOODLE_ERROR_CODES.functionUnavailable,
      "A required Moodle function is unavailable.",
      false,
    );
  }
}

export class MoodleInputError extends MoodleError {
  override readonly name = "MoodleInputError";

  constructor() {
    super(MOODLE_ERROR_CODES.invalidInput, "The Moodle request is invalid.", false);
  }
}

export class MoodlePermissionError extends MoodleError {
  override readonly name = "MoodlePermissionError";

  constructor() {
    super(
      MOODLE_ERROR_CODES.permissionDenied,
      "Moodle denied this operation.",
      false,
    );
  }
}

export class MoodleOutageError extends MoodleError {
  override readonly name = "MoodleOutageError";

  constructor() {
    super(MOODLE_ERROR_CODES.outage, "Moodle is temporarily unavailable.", true);
  }
}

export class MoodleResponseError extends MoodleError {
  override readonly name = "MoodleResponseError";

  constructor(readonly diagnostic?: MoodleResponseDiagnostic) {
    super(
      MOODLE_ERROR_CODES.invalidResponse,
      "Moodle returned an invalid response.",
      false,
    );
  }
}

export class MoodleConfigurationError extends MoodleError {
  override readonly name = "MoodleConfigurationError";

  constructor() {
    super(
      MOODLE_ERROR_CODES.configuration,
      "Moodle integration is not configured correctly.",
      false,
    );
  }
}
