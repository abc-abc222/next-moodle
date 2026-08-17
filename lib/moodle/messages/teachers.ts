import "server-only";

import { createAuthenticatedMoodleClient } from "@/lib/auth/server";
import {
  MOODLE_FUNCTIONS,
  MoodleEnrolledCoursesResponseSchema,
  type MoodleCourseId,
  type MoodleUserId,
} from "@/lib/moodle/server";
import { moodleFileProxyPath } from "@/lib/security/moodle-file";
import { EnrolledUsersSchema } from "../student-dto";
import { toMoodleReadFailure, type MoodleReadResult } from "../queries/dashboard";

export type CourseTeacherCandidate = Readonly<{
  avatarUrl: string | null;
  displayName: string;
  id: MoodleUserId;
  roles: readonly string[];
}>;

export type CourseMessageCandidate = CourseTeacherCandidate & Readonly<{
  kind: "teacher" | "student";
}>;

type ReadCourseTeachersInput = Readonly<{
  courseId: MoodleCourseId;
  roleShortnames: readonly string[];
  siteUrl: string;
  viewerId: MoodleUserId;
}>;

export async function readCourseMessageCandidates(
  input: ReadCourseTeachersInput,
): Promise<MoodleReadResult<readonly CourseMessageCandidate[]>> {
  try {
    const client = await createAuthenticatedMoodleClient();
    const enrolled = await client.call(
      MOODLE_FUNCTIONS.enrolledCourses,
      { userid: input.viewerId },
      MoodleEnrolledCoursesResponseSchema,
    );
    if (!enrolled.data.some((course) => course.id === input.courseId && course.visible !== 0)) {
      return { kind: "failure", reason: "permission" };
    }
    const response = await client.call(MOODLE_FUNCTIONS.participants, {
      courseid: input.courseId,
      "options[0][name]": "limitfrom",
      "options[0][value]": 0,
      "options[1][name]": "limitnumber",
      "options[1][value]": 500,
    }, EnrolledUsersSchema);
    const acceptedRoles = new Set(input.roleShortnames);
    return {
      kind: "ready",
      data: response.data.flatMap((person): readonly CourseMessageCandidate[] => {
        if (person.id === input.viewerId) return [];
        const allRoles = person.roles.map((role) => role.name).filter((role) => role.trim() !== "");
        const teacherRoles = person.roles
          .filter((role) => acceptedRoles.has(role.shortname))
          .map((role) => role.name)
          .filter((role) => role.trim() !== "");
        if (allRoles.length === 0) return [];
        const isTeacher = teacherRoles.length > 0;
        const avatarUrl = person.profileimageurlsmall === undefined
          ? null
          : moodleFileProxyPath(person.profileimageurlsmall, input.siteUrl);
        return [{
          avatarUrl,
          displayName: person.fullname,
          id: person.id as MoodleUserId,
          kind: isTeacher ? "teacher" : "student",
          roles: isTeacher ? teacherRoles : allRoles,
        }];
      }),
    };
  } catch (error) {
    return toMoodleReadFailure(error);
  }
}

export async function readCourseTeacherCandidates(
  input: ReadCourseTeachersInput,
): Promise<MoodleReadResult<readonly CourseTeacherCandidate[]>> {
  const candidates = await readCourseMessageCandidates(input);
  if (candidates.kind === "failure") return candidates;
  return {
    kind: "ready",
    data: candidates.data
      .filter((candidate) => candidate.kind === "teacher")
      .map((candidate) => ({
        avatarUrl: candidate.avatarUrl,
        displayName: candidate.displayName,
        id: candidate.id,
        roles: candidate.roles,
      })),
  };
}
