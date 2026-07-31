import { z } from "zod";

import {
  MoodleAuthError,
  type MoodleError,
  MoodleFunctionError,
  MoodleInputError,
  MoodleOutageError,
  MoodlePermissionError,
  MoodleResponseError,
  responseDiagnosticFromIssues,
} from "./errors";

const MoodleExceptionEnvelopeSchema = z.object({
  exception: z.string(),
  errorcode: z.string(),
  message: z.string(),
});

const MoodleWarningWireSchema = z.object({
  item: z.string().max(128).optional(),
  itemid: z.union([z.string().max(128), z.number().int()]).optional(),
  warningcode: z.string().min(1).max(128),
});

const MoodleWarningsEnvelopeSchema = z.object({
  warnings: z.array(MoodleWarningWireSchema),
});

export type MoodleWarning = {
  readonly code: string;
  readonly item?: string;
  readonly itemId?: string | number;
};

const AUTH_CODES: ReadonlySet<string> = new Set([
  "invalidlogin",
  "invalidtoken",
  "requireloginerror",
  "servicerequireslogin",
]);
const FUNCTION_CODES: ReadonlySet<string> = new Set([
  "functionnotavailable",
  "webservicefunctionnotallowed",
  "wsfunctionnotavailable",
]);
const PERMISSION_CODES: ReadonlySet<string> = new Set([
  "accessexception",
  "nopermissions",
  "requirecapability",
]);
const INPUT_CODES: ReadonlySet<string> = new Set([
  "invalidparameter",
  "invalidrecord",
  "missingparam",
]);

export function errorFromMoodleEnvelope(
  value: unknown,
  functionName?: string,
): MoodleError | null {
  const parsed = MoodleExceptionEnvelopeSchema.safeParse(value);
  if (!parsed.success) {
    return null;
  }
  const code = parsed.data.errorcode.toLowerCase();
  if (AUTH_CODES.has(code)) {
    return new MoodleAuthError();
  }
  if (FUNCTION_CODES.has(code)) {
    return new MoodleFunctionError();
  }
  if (PERMISSION_CODES.has(code)) {
    return new MoodlePermissionError();
  }
  if (INPUT_CODES.has(code)) {
    return new MoodleInputError();
  }
  return new MoodleResponseError(responseDiagnosticFromIssues({
    ...(functionName === undefined ? {} : { functionName }),
    issues: [],
    phase: "exception",
  }));
}

export function warningsFromMoodleResponse(
  value: unknown,
  functionName?: string,
): readonly MoodleWarning[] {
  const object = z.object({ warnings: z.unknown().optional() }).safeParse(value);
  if (!object.success || object.data.warnings === undefined) {
    return [];
  }
  const parsed = MoodleWarningsEnvelopeSchema.safeParse(value);
  if (!parsed.success) {
    throw new MoodleResponseError(responseDiagnosticFromIssues({
      ...(functionName === undefined ? {} : { functionName }),
      issues: parsed.error.issues,
      phase: "warning_schema",
    }));
  }
  return parsed.data.warnings.map((warning) => {
    if (warning.item !== undefined && warning.itemid !== undefined) {
      return {
        code: warning.warningcode,
        item: warning.item,
        itemId: warning.itemid,
      };
    }
    if (warning.item !== undefined) {
      return { code: warning.warningcode, item: warning.item };
    }
    if (warning.itemid !== undefined) {
      return { code: warning.warningcode, itemId: warning.itemid };
    }
    return { code: warning.warningcode };
  });
}

export function errorFromHttpStatus(status: number): MoodleError {
  if (status === 401) {
    return new MoodleAuthError();
  }
  if (status === 403) {
    return new MoodlePermissionError();
  }
  if (status >= 400 && status < 500) {
    return new MoodleInputError();
  }
  if (status >= 500) {
    return new MoodleOutageError();
  }
  return new MoodleResponseError();
}

export async function readMoodleJson(response: Response): Promise<unknown> {
  if (!response.ok) {
    throw errorFromHttpStatus(response.status);
  }
  try {
    return await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new MoodleResponseError();
    }
    throw error;
  }
}
