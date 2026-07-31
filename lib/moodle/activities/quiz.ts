import "server-only";

import { z } from "zod";

import { createAuthenticatedMoodleClient } from "@/lib/auth/server";
import { moodleQuizDocumentFromHtml, type MoodleDocument } from "@/lib/moodle/html";
import { plainTextFromMoodleMessage } from "@/lib/security/html";
import { MOODLE_FUNCTIONS } from "../functions";
import type { MoodleCourseId, MoodleCourseModuleId, MoodleUserId } from "../identifiers";
import { toMoodleReadFailure, type MoodleReadResult } from "../queries/dashboard";

const QuizSchema = z.object({
  id: z.number().int().positive(),
  course: z.number().int().positive(),
  coursemodule: z.number().int().positive(),
  name: z.string().min(1).max(16_384),
  intro: z.string().max(1_000_000).optional().default(""),
  timeopen: z.number().int().nonnegative().optional().default(0),
  timeclose: z.number().int().nonnegative().optional().default(0),
  timelimit: z.number().int().nonnegative().optional().default(0),
  attempts: z.number().int().nonnegative().optional().default(0),
  grade: z.number().nonnegative().optional(),
  hasquestions: z.union([z.boolean(), z.number().int()]).optional(),
});

const AttemptSchema = z.object({
  id: z.number().int().positive(),
  quiz: z.number().int().positive(),
  userid: z.number().int().positive(),
  attempt: z.number().int().positive(),
  currentpage: z.number().int().nonnegative().optional().default(0),
  state: z.enum(["inprogress", "overdue", "finished", "abandoned"]).optional().default("inprogress"),
  timestart: z.number().int().nonnegative().optional().default(0),
  timefinish: z.number().int().nonnegative().optional().default(0),
  timemodified: z.number().int().nonnegative().optional().default(0),
  sumgrades: z.number().nullable().optional(),
});

const QuestionSchema = z.object({
  slot: z.number().int().positive(),
  type: z.string().min(1).max(80),
  page: z.number().int().nonnegative(),
  html: z.string().max(1_000_000),
  sequencecheck: z.number().int().nonnegative().optional(),
  state: z.string().max(120).optional(),
  status: z.string().max(500).optional(),
});

const QuizzesResponseSchema = z.object({ quizzes: z.array(QuizSchema) });
export const QuizAttemptsResponseSchema = z.object({ attempts: z.array(AttemptSchema) });
const AttemptDataResponseSchema = z.object({
  attempt: AttemptSchema,
  messages: z.array(z.string().max(2_000)).default([]),
  nextpage: z.number().int(),
  questions: z.array(QuestionSchema),
});

export type QuizAttempt = Readonly<z.infer<typeof AttemptSchema>>;
export type QuizQuestion = Readonly<{
  document: MoodleDocument;
  maximumMark: string | null;
  page: number;
  slot: number;
  state?: string;
  status?: string;
  type: string;
}>;

function maximumMarkFromQuestionHtml(value: string): string | null {
  const grade = /<(?:div|span)\b[^>]*\bclass\s*=\s*(["'])[^"']*\bgrade\b[^"']*\1[^>]*>([\s\S]*?)<\/(?:div|span)>/i.exec(value)?.[2];
  if (grade === undefined) return null;
  const label = plainTextFromMoodleMessage(grade);
  return label === "" ? null : label.slice(0, 160);
}

export type QuizActivityData = Readonly<{
  activeAttempt: Readonly<{
    attempt: QuizAttempt;
    messages: readonly string[];
    nextPage: number;
    page: number;
    questions: readonly QuizQuestion[];
  }> | null;
  attempts: readonly QuizAttempt[];
  hasQuestions: boolean;
  id: number;
  maxAttempts: number;
  maximumGrade: number | null;
  name: string;
  timeClose: number;
  timeLimit: number;
  timeOpen: number;
}>;

type QuizRequest = Readonly<{
  cmid: MoodleCourseModuleId;
  courseId: MoodleCourseId;
  instance: number | null;
  page: number;
  siteUrl: string;
  userId: MoodleUserId;
}>;

export async function readQuizActivity(
  request: QuizRequest,
): Promise<MoodleReadResult<QuizActivityData | null>> {
  try {
    const client = await createAuthenticatedMoodleClient();
    const quizzes = await client.call(
      MOODLE_FUNCTIONS.quizzes,
      { courseids: [request.courseId] },
      QuizzesResponseSchema,
    );
    const quiz = quizzes.data.quizzes.find((candidate) =>
      candidate.coursemodule === request.cmid || candidate.id === request.instance
    );
    if (quiz === undefined) return { kind: "ready", data: null };
    const attempts = await client.call(
      MOODLE_FUNCTIONS.quizAttempts,
      { quizid: quiz.id, userid: request.userId, status: "all", includepreviews: false },
      QuizAttemptsResponseSchema,
    );
    const inProgress = attempts.data.attempts.findLast((attempt) => attempt.state === "inprogress");
    const active = inProgress === undefined
      ? null
      : await client.call(
          MOODLE_FUNCTIONS.quizAttemptData,
          { attemptid: inProgress.id, page: request.page },
          AttemptDataResponseSchema,
        );
    return {
      kind: "ready",
      data: {
        activeAttempt: active === null ? null : {
          attempt: active.data.attempt,
          messages: active.data.messages,
          nextPage: active.data.nextpage,
          page: request.page,
          questions: active.data.questions.map((question) => ({
            document: moodleQuizDocumentFromHtml(question.html, { siteUrl: request.siteUrl }),
            maximumMark: maximumMarkFromQuestionHtml(question.html),
            page: question.page,
            slot: question.slot,
            type: question.type,
            ...(question.state === undefined ? {} : { state: question.state }),
            ...(question.status === undefined ? {} : { status: question.status }),
          })),
        },
        attempts: attempts.data.attempts,
        hasQuestions: quiz.hasquestions === undefined || Boolean(quiz.hasquestions),
        id: quiz.id,
        maxAttempts: quiz.attempts,
        maximumGrade: quiz.grade ?? null,
        name: quiz.name,
        timeClose: quiz.timeclose,
        timeLimit: quiz.timelimit,
        timeOpen: quiz.timeopen,
      },
    };
  } catch (error) {
    return toMoodleReadFailure(error);
  }
}
