import { z } from "zod";

export const MOODLE_PAGE_FAILURE_CODES = [
  "reauth_required",
  "forbidden",
  "closed",
  "upstream_changed",
  "transient_failure",
] as const;
export const MoodlePageFailureCodeSchema = z.enum(MOODLE_PAGE_FAILURE_CODES);
export type MoodlePageFailureCode = z.infer<typeof MoodlePageFailureCodeSchema>;

export const MOODLE_ACTION_RESULT_KINDS = [
  "success",
  "validation_error",
  ...MOODLE_PAGE_FAILURE_CODES,
] as const;
export const MoodleActionResultKindSchema = z.enum(MOODLE_ACTION_RESULT_KINDS);
export type MoodleActionResultKind = z.infer<typeof MoodleActionResultKindSchema>;

export type MoodleActionResult<T = undefined> =
  | Readonly<{ kind: "success"; data: T }>
  | Readonly<{ kind: "validation_error"; fieldErrors: Readonly<Record<string, string>>; message: string }>
  | Readonly<{ kind: MoodlePageFailureCode; message: string }>;

export class MoodlePageError extends Error {
  override readonly name = "MoodlePageError";

  constructor(readonly code: MoodlePageFailureCode) {
    super(code);
  }
}
