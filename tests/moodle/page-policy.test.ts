import { describe, expect, test } from "bun:test";

import { MoodlePageError } from "@/lib/moodle/page-contracts";
import { assertAllowedMoodlePageUrl, moodlePageUrl } from "@/lib/moodle/page-policy";

const SITE = "https://moodle.example.edu/learning";

describe("authenticated Moodle page URL policy", () => {
  test("builds only a fixed-origin student page", () => {
    expect(moodlePageUrl(SITE, { path: "mod/questionnaire/complete.php", search: { id: 42 } }).toString()).toBe("https://moodle.example.edu/learning/mod/questionnaire/complete.php?id=42");
    expect(moodlePageUrl(SITE, { path: "user/edit.php", search: { id: 8154 } }).pathname).toBe("/learning/user/edit.php");
  });

  test.each([
    "https://evil.invalid/learning/mod/questionnaire/view.php?id=42",
    "https://moodle.example.edu/admin/index.php",
    "https://moodle.example.edu/learning/mod/questionnaire/view.php?id=42&sesskey=secret",
    "https://user:pass@moodle.example.edu/learning/mod/questionnaire/view.php?id=42",
    "https://moodle.example.edu/learning/mod/questionnaire/view.php?id=42#token",
  ])("rejects an arbitrary or secret-bearing target: %s", (value) => {
    expect(() => assertAllowedMoodlePageUrl(new URL(value), SITE)).toThrow(MoodlePageError);
  });
});
