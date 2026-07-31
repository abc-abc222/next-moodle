import { describe, expect, test } from "bun:test";
import {
  MoodleCourseModuleSchema,
  MoodleDashboardCourseSchema,
} from "@/lib/moodle/model";
import {
  activityDestination,
  classifyCourse,
  isInlineCourseLabel,
} from "@/lib/moodle/queries/courses-model";

describe("classifyCourse", () => {
  test.each([
    ["active", { startdate: 100, enddate: 300 }],
    ["future", { startdate: 300, enddate: 400 }],
    ["past", { startdate: 50, enddate: 100 }],
  ] as const)(
    "Given course dates, When classified at the current time, Then it is %s",
    (expected, dates) => {
      const course = MoodleDashboardCourseSchema.parse({
        id: 101,
        fullname: "テストコース",
        shortname: "TEST",
        ...dates,
      });

      const result = classifyCourse(course, 200);

      expect(result).toBe(expected);
    },
  );
});

describe("activityDestination", () => {
  test("Given an assignment, When routed, Then it uses the internal assignment screen", () => {
    const courseModule = MoodleCourseModuleSchema.parse({
      id: 9101,
      name: "フィールドノート",
      modname: "assign",
      url: "https://moodle.example.edu/moodle/mod/assign/view.php?id=9101",
    });

    const result = activityDestination(courseModule, "https://moodle.example.edu/moodle");

    expect(result).toEqual({ kind: "internal", href: "/assignments/9101" });
  });

  test("Given a standard resource, When routed, Then it uses the internal activity workspace", () => {
    const courseModule = MoodleCourseModuleSchema.parse({
      id: 9201,
      name: "講義資料",
      modname: "resource",
      url: "https://moodle.example.edu/moodle/mod/resource/view.php?id=9201",
    });

    const result = activityDestination(courseModule, "https://moodle.example.edu/moodle");

    expect(result).toEqual({ kind: "internal", href: "/activities/9201" });
  });

  test("Given a standard quiz without a Moodle URL, When routed, Then it remains internal", () => {
    const courseModule = MoodleCourseModuleSchema.parse({
      id: 9301,
      name: "理解度チェック",
      modname: "quiz",
    });

    const result = activityDestination(courseModule, "https://moodle.example.edu/moodle");

    expect(result).toEqual({ kind: "internal", href: "/activities/9301" });
  });

  test("Given a Questionnaire activity, When its native adapter is unavailable, Then it opens the safe Moodle fallback", () => {
    const courseModule = MoodleCourseModuleSchema.parse({
      id: 9302,
      name: "出席確認アンケート",
      modname: "questionnaire",
      url: "https://moodle.example.edu/moodle/mod/questionnaire/view.php?id=9302",
    });

    expect(activityDestination(courseModule, "https://moodle.example.edu/moodle")).toEqual({ kind: "moodle", href: "https://moodle.example.edu/moodle/mod/questionnaire/view.php?id=9302" });
  });

  test("Given an unknown module with a trusted Moodle URL, When routed, Then it uses the safe Moodle handoff", () => {
    const courseModule = MoodleCourseModuleSchema.parse({
      id: 9401,
      name: "独自アクティビティ",
      modname: "localcustom",
      url: "https://moodle.example.edu/moodle/mod/localcustom/view.php?id=9401",
    });

    const result = activityDestination(courseModule, "https://moodle.example.edu/moodle");

    expect(result).toEqual({ kind: "moodle", href: "https://moodle.example.edu/moodle/mod/localcustom/view.php?id=9401" });
  });

  test("Given a label module, When projected, Then it is inline content rather than an activity", () => {
    const courseModule = MoodleCourseModuleSchema.parse({
      id: 9501,
      name: "Before class",
      modname: "label",
      description: "<p>Bring a notebook.</p>",
    });

    expect(isInlineCourseLabel(courseModule)).toBe(true);
  });
});
