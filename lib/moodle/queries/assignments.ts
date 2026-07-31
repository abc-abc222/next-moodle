import { z } from "zod";
import { createHash } from "node:crypto";

import {
  MoodleCourseModuleIdSchema,
  type MoodleCourseModuleId,
} from "../identifiers";
import { moodleDocumentFromHtml, type MoodleDocument } from "../html";
import { moodleFileProxyPath } from "../../security/moodle-file";
import {
  deriveNativeSubmissionPolicy,
  type NativeSubmissionPolicy,
} from "./assignment-policy";
import {
  type MoodleAssignmentWire,
  type MoodleSubmissionStatus,
} from "./assignments.schemas";

export const MoodleCourseModulePathSchema = z
  .string()
  .regex(/^[1-9]\d{0,9}$/)
  .transform(Number)
  .pipe(MoodleCourseModuleIdSchema);

export class AssignmentNotFoundError extends Error {
  override readonly name = "AssignmentNotFoundError";
  readonly code = "assignment_not_found";

  constructor() {
    super("The assignment was not found for this learner.");
  }
}

export type AssignmentTiming =
  | "scheduled"
  | "open"
  | "overdue"
  | "closed"
  | "no_due_date";

export type AssignmentSubmissionState =
  | "new"
  | "draft"
  | "submitted"
  | "graded"
  | "locked"
  | "other";

export type AssignmentFile = Readonly<{
  downloadUrl?: string;
  filename: string;
  filesize: number;
  key: string;
  mimetype: string;
}>;

export type AssignmentOnlineText = Readonly<{
  content: string;
  format: number;
}>;

export type AssignmentFeedback = Readonly<{
  comments: readonly MoodleDocument[];
  grade: MoodleDocument | null;
  gradedAt: number;
}>;

export type AssignmentDetail = Readonly<{
  assignment: MoodleAssignmentWire;
  cmid: MoodleCourseModuleId;
  courseName: string;
  description: MoodleDocument;
  dueAt: number;
  existingFiles: readonly AssignmentFile[];
  existingText: AssignmentOnlineText;
  feedback: AssignmentFeedback | null;
  isGraded: boolean;
  isLocked: boolean;
  isOverdue: boolean;
  moodleUrl: string;
  name: string;
  nativeSubmission: NativeSubmissionPolicy;
  status: AssignmentSubmissionState;
  timing: AssignmentTiming;
  updatedAt: number;
}>;

type AssignmentProjectionInput = Readonly<{
  assignment: MoodleAssignmentWire;
  canFinalize: boolean;
  canSave: boolean;
  course: Readonly<{ readonly fullname: string }>;
  fileUpload: boolean;
  now: number;
  siteUrl: string;
  submission: MoodleSubmissionStatus;
}>;

function timingFor(
  assignment: MoodleAssignmentWire,
  dueAt: number,
  now: number,
): AssignmentTiming {
  if (assignment.allowsubmissionsfromdate > 0 && now < assignment.allowsubmissionsfromdate) {
    return "scheduled";
  }
  if (dueAt === 0) {
    return "no_due_date";
  }
  if (now <= dueAt) {
    return "open";
  }
  if (assignment.cutoffdate === 0 || now <= assignment.cutoffdate) {
    return "overdue";
  }
  return "closed";
}

function statusFor(submission: MoodleSubmissionStatus): AssignmentSubmissionState {
  const attempt = submission.lastattempt;
  const grading = attempt?.gradingstatus.toLowerCase();
  if (attempt?.graded || grading === "graded") {
    return "graded";
  }
  if (attempt?.locked) {
    return "locked";
  }
  const state = attempt?.submission?.status.toLowerCase() ?? "new";
  if (state === "new" || state === "draft" || state === "submitted") {
    return state;
  }
  return "other";
}

function existingFiles(
  submission: MoodleSubmissionStatus,
  cmid: MoodleCourseModuleId,
  siteUrl: string,
): readonly AssignmentFile[] {
  return (submission.lastattempt?.submission?.plugins ?? []).flatMap((plugin) =>
    plugin.fileareas.flatMap((area) =>
      area.files.map((file) => {
        const identity = `${cmid}|${file.fileurl ?? ""}|${file.filename}|${file.filesize}|${file.mimetype}`;
        const downloadUrl = file.fileurl === undefined
          ? null
          : moodleFileProxyPath(file.fileurl, siteUrl);
        return {
          filename: file.filename,
          filesize: file.filesize,
          key: createHash("sha256").update(identity).digest("base64url"),
          mimetype: file.mimetype,
          ...(downloadUrl === null ? {} : { downloadUrl }),
        };
      }),
    ),
  );
}

function existingText(submission: MoodleSubmissionStatus): AssignmentOnlineText {
  const plugins = submission.lastattempt?.submission?.plugins ?? [];
  for (const plugin of plugins) {
    if (plugin.type.toLowerCase().replace(/^assignsubmission_/, "") !== "onlinetext") {
      continue;
    }
    const editor = plugin.editorfields[0];
    if (editor !== undefined) {
      const format = editor.format ?? 2;
      return {
        content: editor.text,
        format,
      };
    }
  }
  return { content: "", format: 2 };
}

function feedbackFor(
  submission: MoodleSubmissionStatus,
  siteUrl: string,
): AssignmentFeedback | null {
  const feedback = submission.feedback;
  if (feedback === undefined || Array.isArray(feedback)) {
    return null;
  }
  const comments: MoodleDocument[] = [];
  for (const plugin of feedback.plugins) {
    for (const field of plugin.editorfields) {
      if (field.text !== "") {
        comments.push(moodleDocumentFromHtml(field.text, { siteUrl }));
      }
    }
  }
  const grade =
    feedback.gradefordisplay === undefined
      ? null
      : moodleDocumentFromHtml(feedback.gradefordisplay, { siteUrl });
  return grade === null && comments.length === 0
    ? null
    : { comments, grade, gradedAt: feedback.gradeddate };
}

function assignmentUrl(siteUrl: string, cmid: MoodleCourseModuleId): string {
  const base = new URL(`${siteUrl.replace(/\/+$/, "")}/`);
  const url = new URL("mod/assign/view.php", base);
  url.searchParams.set("id", String(cmid));
  return url.toString();
}

export function projectAssignmentDetail(
  input: AssignmentProjectionInput,
): AssignmentDetail {
  const attempt = input.submission.lastattempt;
  const dueAt = attempt?.extensionduedate || input.assignment.duedate;
  const grading = attempt?.gradingstatus.toLowerCase();
  return {
    assignment: input.assignment,
    cmid: input.assignment.cmid,
    courseName: input.course.fullname,
    description: moodleDocumentFromHtml(input.assignment.intro, {
      siteUrl: input.siteUrl,
    }),
    dueAt,
    existingFiles: existingFiles(input.submission, input.assignment.cmid, input.siteUrl),
    existingText: existingText(input.submission),
    feedback: feedbackFor(input.submission, input.siteUrl),
    isGraded: attempt?.graded === true || grading === "graded",
    isLocked: attempt?.locked === true,
    isOverdue: dueAt > 0 && input.now > dueAt,
    moodleUrl: assignmentUrl(input.siteUrl, input.assignment.cmid),
    name: input.assignment.name,
    nativeSubmission: deriveNativeSubmissionPolicy(input),
    status: statusFor(input.submission),
    timing: timingFor(input.assignment, dueAt, input.now),
    updatedAt: attempt?.submission?.timemodified ?? 0,
  };
}
