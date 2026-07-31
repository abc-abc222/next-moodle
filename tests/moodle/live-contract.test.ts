import { expect, test } from "bun:test";

import { authenticateWithMoodle } from "@/lib/moodle/auth";
import { MoodleClient } from "@/lib/moodle/client";
import { createMoodleConfig } from "@/lib/moodle/config";
import {
  MoodleCourseSectionsResponseSchema,
  MoodleEnrolledCoursesResponseSchema,
} from "@/lib/moodle/dto";
import { MOODLE_FUNCTIONS } from "@/lib/moodle/functions";
import { MoodleCredentialsSchema } from "@/lib/moodle/identifiers";
import { UserProfilesSchema } from "@/lib/moodle/student-dto";

const enabled = process.env.MOODLE_LIVE_INTEGRATION === "1";
const liveTest = enabled ? test : test.skip;

liveTest("live Moodle read contract accepts profile and every enrolled course", async () => {
  const baseUrl = process.env.MOODLE_LIVE_BASE_URL;
  const username = process.env.MOODLE_LIVE_USERNAME;
  const password = process.env.MOODLE_LIVE_PASSWORD;
  if (baseUrl === undefined || username === undefined || password === undefined) {
    throw new Error("Live Moodle integration credentials are required when MOODLE_LIVE_INTEGRATION=1.");
  }

  const config = createMoodleConfig({
    baseUrl,
    service: process.env.MOODLE_LIVE_SERVICE ?? "moodle_mobile_app",
  });
  const login = await authenticateWithMoodle(
    config,
    MoodleCredentialsSchema.parse({ username, password }),
  );
  const client = new MoodleClient({ config, token: login.token });
  const profile = await client.call(
    MOODLE_FUNCTIONS.usersByField,
    { field: "id", values: [login.userId] },
    UserProfilesSchema,
  );
  const courses = await client.call(
    MOODLE_FUNCTIONS.enrolledCourses,
    { userid: login.userId },
    MoodleEnrolledCoursesResponseSchema,
  );

  expect(profile.data).toHaveLength(1);
  for (const course of courses.data) {
    const contents = await client.call(
      MOODLE_FUNCTIONS.courseContents,
      { courseid: course.id },
      MoodleCourseSectionsResponseSchema,
    );
    expect(Array.isArray(contents.data)).toBe(true);
  }
}, 120_000);
