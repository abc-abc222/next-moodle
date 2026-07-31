import "server-only";

import { cache } from "react";

import { createAuthenticatedMoodleClient } from "@/lib/auth/server";
import type { MoodleCapabilityManifest } from "@/lib/moodle/capabilities";
import { resolveActivity, resolveActivityDelivery, type ActivityResolution } from "@/lib/moodle/activities/registry";
import type { CapabilityDelivery } from "@/lib/moodle/capabilities";
import {
  MOODLE_FUNCTIONS,
  MoodleCourseSectionsResponseSchema,
  MoodleEnrolledCoursesResponseSchema,
  type MoodleCourseId,
  type MoodleCourseModuleId,
  type MoodleUserId,
} from "@/lib/moodle/server";
import { moodleFileProxyPath } from "@/lib/security/moodle-file";
import { moodleDocumentFromHtml, type MoodleDocument } from "@/lib/moodle/html";
import { readHtmlActivityScreen, type HtmlActivityScreen } from "@/lib/moodle/activities/html-screen";
import { safeMoodleUrl } from "./courses-model";
import { toMoodleReadFailure, type MoodleReadResult } from "./dashboard";

export type ActivityFile = Readonly<{
  downloadUrl: string | null;
  filename: string;
  filesize: number;
  mimetype: string;
}>;

export type ActivityWorkspaceDetail = Readonly<{
  resolution: ActivityResolution;
  delivery: CapabilityDelivery;
  availability: "available" | "hidden" | "restricted";
  completion: "complete" | "incomplete" | "none";
  course: Readonly<{ id: MoodleCourseId; name: string; shortName: string }>;
  description: MoodleDocument;
  files: readonly ActivityFile[];
  htmlScreen: HtmlActivityScreen | null;
  id: MoodleCourseModuleId;
  instance: number | null;
  moduleType: string;
  name: string;
  section: Readonly<{ id: number; name: string }>;
  sourceUrl: string | null;
  dates: readonly Readonly<{ label: string; timestamp: number }>[];
}>;

type ActivityQueryRequest = Readonly<{
  cmid: MoodleCourseModuleId;
  manifest: MoodleCapabilityManifest;
  siteUrl: string;
  userId: MoodleUserId;
}>;

export const readActivityWorkspace = cache(
  async (request: ActivityQueryRequest): Promise<MoodleReadResult<ActivityWorkspaceDetail | null>> => {
    try {
      const client = await createAuthenticatedMoodleClient();
      const enrolled = await client.call(
        MOODLE_FUNCTIONS.enrolledCourses,
        { userid: request.userId },
        MoodleEnrolledCoursesResponseSchema,
      );
      for (const course of enrolled.data) {
        const contents = await client.call(
          MOODLE_FUNCTIONS.courseContents,
          { courseid: course.id },
          MoodleCourseSectionsResponseSchema,
        );
        for (const section of contents.data) {
          const courseModule = section.modules.find((candidate) => candidate.id === request.cmid);
          if (courseModule === undefined) continue;
          if (course.visible === 0 || courseModule.visible === 0 || courseModule.uservisible === false) {
            return { kind: "failure", reason: "permission" };
          }
          const resolution = resolveActivity(courseModule.modname, request.manifest);
          const description = moodleDocumentFromHtml(courseModule.description ?? "", { siteUrl: request.siteUrl });
          const htmlScreen = resolution.kind === "html"
            ? await readHtmlActivityScreen({
              cmid: courseModule.id,
              instance: courseModule.instance ?? null,
              moduleName: courseModule.modname,
              siteUrl: request.siteUrl,
              userId: request.userId,
            })
            : null;
          return {
            kind: "ready",
            data: {
              resolution,
              delivery: resolveActivityDelivery(courseModule.modname, request.manifest),
              availability: "available",
              completion: courseModule.completion === undefined || courseModule.completion === 0
                ? "none"
                : (courseModule.completiondata?.state ?? 0) > 0 ? "complete" : "incomplete",
              course: { id: course.id, name: course.fullname, shortName: course.shortname },
              dates: (courseModule.dates ?? []).map((date) => ({ label: date.label, timestamp: date.timestamp })),
              description,
              files: (courseModule.contents ?? []).map((file) => ({
                downloadUrl: file.fileurl === undefined
                  ? null
                  : moodleFileProxyPath(file.fileurl, request.siteUrl),
                filename: file.filename,
                filesize: file.filesize ?? 0,
                mimetype: file.mimetype ?? "application/octet-stream",
              })),
              htmlScreen,
              id: courseModule.id,
              instance: courseModule.instance ?? null,
              moduleType: courseModule.modname,
              name: courseModule.name,
              section: { id: section.id, name: section.name },
              sourceUrl: courseModule.url === undefined
                ? null
                : safeMoodleUrl(courseModule.url, request.siteUrl),
            },
          };
        }
      }
      return { kind: "ready", data: null };
    } catch (error) {
      return toMoodleReadFailure(error);
    }
  },
);
