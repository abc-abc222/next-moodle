import "server-only";

import { z } from "zod";

import { createAuthenticatedMoodleClient } from "@/lib/auth/server";
import { moodleQuizDocumentFromHtml } from "@/lib/moodle/html";
import { MOODLE_FUNCTIONS } from "../functions";
import type { MoodleCourseId, MoodleCourseModuleId } from "../identifiers";
import { toMoodleReadFailure, type MoodleReadResult } from "../queries/dashboard";
import type { LessonActivityData } from "./lesson-model";

const LessonSchema = z.object({
  course: z.number().int().positive(),
  coursemodule: z.number().int().positive().optional(),
  id: z.number().int().positive(),
  name: z.string().min(1).max(16_384),
});
const LessonsResponseSchema = z.object({ lessons: z.array(LessonSchema) });
const LessonPageResponseSchema = z.object({
  newpageid: z.number().int(),
  page: z.object({
    contents: z.string().max(1_000_000).optional().default(""),
    id: z.number().int().positive(),
    title: z.string().max(16_384).optional().default(""),
  }).optional(),
  pagecontent: z.string().max(1_000_000).optional(),
  progress: z.number().int().min(0).max(100).nullable().optional().default(null),
});

type LessonRequest = Readonly<{
  cmid: MoodleCourseModuleId;
  courseId: MoodleCourseId;
  instance: number | null;
  pageId: number | null;
  siteUrl: string;
}>;

export async function readLessonActivity(
  request: LessonRequest,
): Promise<MoodleReadResult<LessonActivityData | null>> {
  try {
    const client = await createAuthenticatedMoodleClient();
    const lessons = await client.call(
      MOODLE_FUNCTIONS.lessons,
      { courseids: [request.courseId] },
      LessonsResponseSchema,
    );
    const lesson = lessons.data.lessons.find((candidate) =>
      candidate.coursemodule === request.cmid || candidate.id === request.instance
    );
    if (lesson === undefined) return { kind: "ready", data: null };
    if (request.pageId === null) {
      return {
        kind: "ready",
        data: {
          completed: false,
          content: moodleQuizDocumentFromHtml("", { siteUrl: request.siteUrl }),
          id: lesson.id,
          name: lesson.name,
          pageId: null,
          progress: null,
        },
      };
    }
    const response = await client.call(
      MOODLE_FUNCTIONS.lessonPage,
      { lessonid: lesson.id, pageid: request.pageId, password: "", review: false, returncontents: true },
      LessonPageResponseSchema,
    );
    const completed = response.data.newpageid < 0 || response.data.page === undefined;
    const content = response.data.pagecontent ?? response.data.page?.contents ?? "";
    return {
      kind: "ready",
      data: {
        completed,
        content: moodleQuizDocumentFromHtml(content, { siteUrl: request.siteUrl }),
        id: lesson.id,
        name: lesson.name,
        pageId: completed ? null : response.data.page?.id ?? response.data.newpageid,
        progress: response.data.progress,
      },
    };
  } catch (error) {
    return toMoodleReadFailure(error);
  }
}
