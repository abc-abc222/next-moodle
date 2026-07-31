import "server-only";

import { cache } from "react";

import {
  MOODLE_FUNCTIONS,
  MoodleCourseSectionsResponseSchema,
  MoodleEnrolledCoursesResponseSchema,
  type MoodleCourseId,
  type MoodleDashboardCourse,
  type MoodleUserId,
} from "@/lib/moodle/server";
import type { CapabilityDelivery, MoodleCapabilityManifest } from "@/lib/moodle/capabilities";
import { resolveActivityAdapter, resolveActivityDelivery } from "@/lib/moodle/activities/registry";
import { createAuthenticatedMoodleClient } from "@/lib/auth/server";
import { sanitizeMoodleHtml, type SanitizedMoodleHtml } from "@/lib/security/html";
import { moodleFileProxyPath } from "@/lib/security/moodle-file";
import {
  activityDestination,
  isInlineCourseLabel,
  projectCourseList,
  type ActivityDestination,
  type CourseListItem,
} from "./courses-model";
import {
  toMoodleReadFailure,
  type MoodleReadResult,
} from "./dashboard";

export type CommandCourse = {
  readonly href: string;
  readonly name: string;
  readonly shortName: string;
};

export type CourseActivity = {
  readonly kind: "activity";
  readonly adapterState: "native" | "companion" | "adapter_required" | "unavailable";
  readonly delivery: CapabilityDelivery;
  readonly availability: "available" | "hidden" | "restricted";
  readonly completion: "complete" | "incomplete" | "none";
  readonly description: SanitizedMoodleHtml;
  readonly destination: ActivityDestination;
  readonly dueAt?: number;
  readonly files: readonly Readonly<{
    downloadUrl: string | null;
    filename: string;
    filesize: number;
    mimetype: string;
  }>[];
  readonly id: number;
  readonly moduleType: string;
  readonly name: string;
  readonly typeLabel: string;
};

export type CourseInlineLabel = Readonly<{
  content: SanitizedMoodleHtml;
  id: number;
  kind: "label";
  title: string;
}>;

export type CourseModuleError = Readonly<{
  id: number;
  kind: "error";
  moduleType: string;
  name: string;
}>;

export type CourseStreamItem = CourseActivity | CourseInlineLabel | CourseModuleError;

export type CourseSection = {
  readonly id: number;
  readonly items: readonly CourseStreamItem[];
  readonly name: string;
  readonly summary: SanitizedMoodleHtml;
};

export type CourseDetail = {
  readonly course: CourseListItem;
  readonly sections: readonly CourseSection[];
};

export type CourseAdapterDiagnostic = Readonly<{
  count: number;
  moduleType: string;
}>;

type CourseDetailRequest = {
  readonly courseId: MoodleCourseId;
  readonly manifest: MoodleCapabilityManifest;
  readonly nowSeconds: number;
  readonly siteUrl: string;
  readonly userId: MoodleUserId;
};

const readEnrolledCourses = cache(
  async (
    userId: MoodleUserId,
  ): Promise<MoodleReadResult<readonly MoodleDashboardCourse[]>> => {
    try {
      const client = await createAuthenticatedMoodleClient();
      const result = await client.call(
        MOODLE_FUNCTIONS.enrolledCourses,
        { userid: userId },
        MoodleEnrolledCoursesResponseSchema,
      );
      return { kind: "ready", data: result.data };
    } catch (error) {
      return toMoodleReadFailure(error);
    }
  },
);

export const readCourses = cache(
  async (
    userId: MoodleUserId,
    nowSeconds: number,
  ): Promise<MoodleReadResult<readonly CourseListItem[]>> => {
    const result = await readEnrolledCourses(userId);
    return result.kind === "failure"
      ? result
      : { kind: "ready", data: projectCourseList(result.data, nowSeconds) };
  },
);

export const readCourseAdapterDiagnostics = cache(
  async (
    userId: MoodleUserId,
    manifest: MoodleCapabilityManifest,
  ): Promise<MoodleReadResult<readonly CourseAdapterDiagnostic[]>> => {
    const enrolled = await readEnrolledCourses(userId);
    if (enrolled.kind === "failure") return enrolled;
    try {
      const client = await createAuthenticatedMoodleClient();
      const unresolved = new Map<string, number>();
      for (const course of enrolled.data) {
        if (course.visible === 0) continue;
        const contents = await client.call(
          MOODLE_FUNCTIONS.courseContents,
          { courseid: course.id },
          MoodleCourseSectionsResponseSchema,
        );
        for (const section of contents.data) {
          if (section.visible === 0) continue;
          for (const courseModule of section.modules) {
            if (isInlineCourseLabel(courseModule)) continue;
            const resolution = resolveActivityAdapter(courseModule.modname, manifest);
            const resolvedByCompanion = resolution.kind === "adapter_required" &&
              manifest.companionModules.includes(courseModule.modname);
            if (courseModule.integrity !== "malformed" && (resolution.kind === "native" || resolvedByCompanion)) continue;
            unresolved.set(courseModule.modname, (unresolved.get(courseModule.modname) ?? 0) + 1);
          }
        }
      }
      return {
        kind: "ready",
        data: [...unresolved.entries()]
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([moduleType, count]) => ({ count, moduleType })),
      };
    } catch (error) {
      return toMoodleReadFailure(error);
    }
  },
);

export const readCommandCourses = cache(
  async (
    userId: MoodleUserId,
  ): Promise<MoodleReadResult<readonly CommandCourse[]>> => {
    const result = await readEnrolledCourses(userId);
    if (result.kind === "failure") {
      return result;
    }
    const commands: CommandCourse[] = [];
    for (const course of result.data) {
      if (course.visible !== 0) {
        commands.push({
          href: `/courses/${course.id}`,
          name: course.fullname,
          shortName: course.shortname,
        });
      }
    }
    return {
      kind: "ready",
      data: commands,
    };
  },
);

export const readCourseDetail = cache(
  async (
    request: CourseDetailRequest,
  ): Promise<MoodleReadResult<CourseDetail | null>> => {
    const enrolled = await readEnrolledCourses(request.userId);
    if (enrolled.kind === "failure") {
      return enrolled;
    }
    const course = enrolled.data.find((candidate) => candidate.id === request.courseId);
    if (course === undefined) {
      return { kind: "ready", data: null };
    }
    if (course.visible === 0) {
      return { kind: "failure", reason: "permission" };
    }
    try {
      const client = await createAuthenticatedMoodleClient();
      const contents = await client.call(
        MOODLE_FUNCTIONS.courseContents,
        { courseid: request.courseId },
        MoodleCourseSectionsResponseSchema,
      );
      const courseItem = projectCourseList([course], request.nowSeconds)[0];
      if (courseItem === undefined) {
        return { kind: "ready", data: null };
      }
      const sections: CourseSection[] = [];
      for (const section of contents.data) {
        if (section.visible === 0) continue;
        const items: CourseStreamItem[] = [];
        for (const courseModule of section.modules) {
          if (isInlineCourseLabel(courseModule)) {
            items.push({
              content: sanitizeMoodleHtml(courseModule.description ?? "", { siteUrl: request.siteUrl }),
              id: courseModule.id,
              kind: "label",
              title: courseModule.name,
            });
            continue;
          }
          if (courseModule.integrity === "malformed") {
            items.push({
              id: courseModule.id,
              kind: "error",
              moduleType: courseModule.modname,
              name: courseModule.name,
            });
            continue;
          }
          const resolution = resolveActivityAdapter(courseModule.modname, request.manifest);
          const hasCompanionAdapter = resolution.kind === "adapter_required" &&
            request.manifest.companionModules.includes(courseModule.modname);
          const dueAt = courseModule.dates?.find((date) =>
            date.dataid?.toLowerCase().includes("due") === true ||
            date.label.toLowerCase().includes("due") || date.label.includes("期限"),
          )?.timestamp;
          items.push({
            adapterState: hasCompanionAdapter ? "companion" : resolution.kind,
            delivery: resolveActivityDelivery(courseModule.modname, request.manifest),
            availability: courseModule.visible === 0
              ? "hidden"
              : courseModule.uservisible === false ? "restricted" : "available",
            completion: courseModule.completion === undefined || courseModule.completion === 0
              ? "none"
              : (courseModule.completiondata?.state ?? 0) > 0 ? "complete" : "incomplete",
            description: sanitizeMoodleHtml(courseModule.description ?? "", { siteUrl: request.siteUrl }),
            destination: hasCompanionAdapter
              ? { kind: "internal", href: `/activities/${courseModule.id}` }
              : activityDestination(courseModule),
            ...(dueAt === undefined ? {} : { dueAt }),
            files: (courseModule.contents ?? []).map((file) => ({
              downloadUrl: file.fileurl === undefined ? null : moodleFileProxyPath(file.fileurl, request.siteUrl),
              filename: file.filename,
              filesize: file.filesize ?? 0,
              mimetype: file.mimetype ?? "application/octet-stream",
            })),
            id: courseModule.id,
            kind: "activity",
            moduleType: courseModule.modname,
            name: courseModule.name,
            typeLabel: resolution.kind === "native"
              ? resolution.adapter.label
              : courseModule.modname === "questionnaire" ? "アンケート" : courseModule.modname,
          });
        }
        sections.push({
          id: section.id,
          items,
          name: section.name,
          summary: sanitizeMoodleHtml(section.summary ?? "", { siteUrl: request.siteUrl }),
        });
      }
      return {
        kind: "ready",
        data: {
          course: courseItem,
          sections,
        },
      };
    } catch (error) {
      return toMoodleReadFailure(error);
    }
  },
);
