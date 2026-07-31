import { describe, expect, test } from "bun:test";

import { authenticateWithMoodle, requestMoodleToken } from "../../lib/moodle/auth";
import { MoodleAuthError } from "../../lib/moodle/errors";
import {
  createMoodleConfig,
  MOODLE_FUNCTIONS,
  MoodleCredentialsSchema,
  MoodleTokenSchema,
} from "../../lib/moodle/model";
import { jsonResponse, startWireMoodle } from "./wire-fake";

const credentials = MoodleCredentialsSchema.parse({
  username: "fixture-student",
  password: "fixture-password",
});

describe("Moodle login boundary", () => {
  test("posts credentials only to the official token endpoint", async () => {
    // Given
    const moodle = startWireMoodle(() =>
      jsonResponse({ token: "fixture-issued-token" }),
    );
    const config = createMoodleConfig({
      baseUrl: moodle.baseUrl,
      service: "moodle_mobile_app",
      timeoutMs: 500,
    });

    try {
      // When
      const token = await requestMoodleToken(config, credentials);

      // Then
      expect(token).toBe(MoodleTokenSchema.parse("fixture-issued-token"));
      expect(moodle.requests).toHaveLength(1);
      expect(moodle.requests[0]?.path).toBe("/login/token.php");
      expect(moodle.requests[0]?.form.get("service")).toBe("moodle_mobile_app");
      expect(moodle.requests[0]?.form.get("username")).toBe("fixture-student");
      expect(moodle.requests[0]?.form.get("password")).toBe("fixture-password");
    } finally {
      moodle.close();
    }
  });

  test("redacts a token-endpoint credential failure", async () => {
    // Given
    const moodle = startWireMoodle(() =>
      jsonResponse({
        error: "Invalid login with private detail",
        errorcode: "invalidlogin",
      }),
    );
    const config = createMoodleConfig({
      baseUrl: moodle.baseUrl,
      service: "moodle_mobile_app",
      timeoutMs: 500,
    });

    try {
      // When
      const outcome = requestMoodleToken(config, credentials);

      // Then
      await expect(outcome).rejects.toBeInstanceOf(MoodleAuthError);
      await expect(outcome).rejects.toMatchObject({
        code: "authentication_failed",
        message: "Moodle authentication failed.",
      });
    } finally {
      moodle.close();
    }
  });

  test("parses safe site info and derives a compact feature manifest", async () => {
    // Given
    const moodle = startWireMoodle((request) => {
      if (request.path === "/login/token.php") {
        return jsonResponse({ token: "fixture-issued-token" });
      }
      return jsonResponse({
        userid: 41,
        sitename: "Example Learning Hub",
        siteurl: moodle.baseUrl,
        fullname: "Private Student Name",
        functions: [
          { name: MOODLE_FUNCTIONS.siteInfo, version: "2026042000" },
          { name: MOODLE_FUNCTIONS.enrolledCourses, version: "2026042000" },
          { name: MOODLE_FUNCTIONS.courseContents, version: "2026042000" },
          { name: MOODLE_FUNCTIONS.calendarMonthly, version: "2026042000" },
          { name: MOODLE_FUNCTIONS.calendarUpcoming, version: "2026042000" },
        ],
      });
    });
    const config = createMoodleConfig({
      baseUrl: moodle.baseUrl,
      service: "moodle_mobile_app",
      timeoutMs: 500,
    });

    try {
      // When
      const login = await authenticateWithMoodle(config, credentials);

      // Then
      expect(login.site.siteName).toBe("Example Learning Hub");
      expect(login.service).toBe("moodle_mobile_app");
      expect(login.manifest.version).toBe(4);
      expect(login.manifest.functionHash).toMatch(/^[a-f0-9]{64}$/);
      expect(login.manifest.functionBits).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(login.manifest.features.courses).toBe("available");
      expect(login.manifest.features.calendar).toBe("available");
      expect(login.manifest.features.assignmentsRead).toBe("unavailable");
      expect(JSON.stringify(login.manifest)).not.toContain(
        MOODLE_FUNCTIONS.courseContents,
      );
      expect(JSON.stringify(login)).not.toContain("Private Student Name");
      expect(moodle.requests).toHaveLength(2);
    } finally {
      moodle.close();
    }
  });
});
