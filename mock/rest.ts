import { FIXTURE_TOKENS } from "./fixtures";
import { numberField } from "./params";
import { calendarPayload } from "./rest-calendar";
import type { RestContext } from "./rest-context";
import { emptyPayload } from "./rest-empty";
import { forumChoicePayload } from "./rest-forum-choice";
import { knowledgePayload } from "./rest-knowledge";
import { quizPayload } from "./rest-quiz";
import { studentPayload } from "./rest-student";
import type { FixtureUser, MoodleFunction, MoodleMockState, MockRequestInput } from "./types";
import {
  siteInfo,
  wireAssignment,
  wireCourse,
  wireNotification,
  wireSection,
  withWarnings,
} from "./wire";

const coursePayload = (user: FixtureUser): Record<string, unknown> => ({
  courses: user.courses.map(wireCourse),
  nextoffset: 0,
});

function mockMoodleUrl(value: string | undefined, siteUrl: string): string | undefined {
  if (value === undefined) return undefined;
  try {
    const fixtureUrl = new URL(value);
    if (fixtureUrl.hostname !== "moodle.synthetic.invalid") return value;
    const mockUrl = new URL(siteUrl);
    fixtureUrl.protocol = mockUrl.protocol;
    fixtureUrl.host = mockUrl.host;
    return fixtureUrl.toString();
  } catch {
    return value;
  }
}

const sectionsFor = (
  user: FixtureUser,
  input: MockRequestInput,
  state: MoodleMockState,
  siteUrl: string,
): readonly unknown[] => {
  const requested = numberField(input, "courseid", "courseids[0]");
  const sections = requested === undefined
    ? user.sections[String(user.courses[0]?.id ?? 0)] ?? []
    : user.sections[String(requested)] ?? [];
  return sections.map((section) => ({
    ...wireSection(section),
    modules: section.modules.map((courseModule) => ({
      ...courseModule,
      ...(courseModule.url === undefined ? {} : { url: mockMoodleUrl(courseModule.url, siteUrl) }),
      visible: courseModule.visible ? 1 : 0,
      completiondata: state.completedActivities.has(`${user.key}:${courseModule.id}`)
        ? { ...courseModule.completiondata, state: 1, timecompleted: 1_790_000_200 }
        : courseModule.completiondata,
    })),
  }));
};

const completionFor = (user: FixtureUser, input: MockRequestInput): Record<string, unknown> => {
  const requested = numberField(input, "courseid", "courseids[0]");
  const courseId = requested ?? user.courses[0]?.id ?? 0;
  return {
    statuses: (user.completion[String(courseId)] ?? []).map((status) => ({
      ...status,
      instance: status["cmid"] ?? 0,
      modname: "assign",
    })),
  };
};

const assignmentsPayload = (user: FixtureUser): Record<string, unknown> => ({
  courses: user.courses.map((course) => {
    const assignments: Record<string, unknown>[] = [];
    for (const assignment of user.assignments) {
      if (assignment.courseid === course.id) assignments.push(wireAssignment(assignment));
    }
    return { assignments, fullname: course.fullname, id: course.id };
  }),
});

const submissionPayload = (user: FixtureUser, input: MockRequestInput): Record<string, unknown> => {
  const assignmentId = numberField(input, "assignid", "assignmentid") ?? user.assignments[0]?.id ?? 0;
  const submission = user.submissions.find((candidate) => candidate.assignmentid === assignmentId) ?? {
    assignmentid: assignmentId,
    status: "new",
    gradingstatus: "notgraded",
    attemptnumber: 0,
    timestarted: 0,
    timemodified: 0,
    groupid: 0,
    plugins: [],
  };
  return {
    ...submission,
    lastattempt: {
      submission,
      submissionsenabled: true,
      locked: false,
      graded: false,
      canedit: true,
      cansubmit: true,
      extensionduedate: 0,
      blindmarking: false,
      gradingstatus: submission.gradingstatus,
    },
    feedback: [],
    gradingsummary: { grade: null, gradeddate: 0 },
  };
};

const saveSubmission = (context: RestContext): Record<string, unknown> => {
  const assignmentId = numberField(context.input, "assignmentid") ?? context.user.assignments[0]?.id ?? 0;
  const plugindata: Record<string, string> = {};
  for (const [key, values] of context.input.fields) {
    if (key.startsWith("plugindata") || key === "onlinetext") plugindata[key] = values[0] ?? "";
  }
  context.state.submissions.set(`${context.user.key}:${assignmentId}`, {
    user: context.user.key,
    assignmentid: assignmentId,
    plugindata,
    submitted: false,
  });
  return { status: true, warnings: [] };
};

const submitForGrading = (context: RestContext): Record<string, unknown> => {
  const assignmentId = numberField(context.input, "assignmentid") ?? context.user.assignments[0]?.id ?? 0;
  const previous = context.state.submissions.get(`${context.user.key}:${assignmentId}`);
  context.state.submissions.set(`${context.user.key}:${assignmentId}`, {
    user: context.user.key,
    assignmentid: assignmentId,
    plugindata: previous?.plugindata ?? {},
    submitted: true,
  });
  return { status: true, warnings: [] };
};

const notificationPayload = (context: RestContext): Record<string, unknown> => {
  const notifications: Record<string, unknown>[] = [];
  for (const notification of context.user.notifications) {
    if (!context.state.readNotifications.has(`${context.user.key}:${notification.id}`)) {
      notifications.push(wireNotification(notification));
    }
  }
  return { newestfirst: true, notifications };
};

const delegatedPayload = (functionName: MoodleFunction, context: RestContext): unknown =>
  calendarPayload(functionName, context) ??
  quizPayload(functionName, context) ??
  forumChoicePayload(functionName, context) ??
  knowledgePayload(functionName, context) ??
  studentPayload(functionName, context) ??
  emptyPayload(functionName);

const successPayload = (functionName: MoodleFunction, context: RestContext): unknown => {
  switch (functionName) {
    case "core_webservice_get_site_info":
      return siteInfo(context.user, context.options, context.siteUrl);
    case "core_course_get_enrolled_courses_by_timeline_classification":
      return coursePayload(context.user);
    case "core_enrol_get_users_courses":
      return context.user.courses.map((course) => ({ ...wireCourse(course), isfavourite: context.state.favouriteCourses.has(`${context.user.key}:${course.id}`) }));
    case "core_course_set_favourite_courses": {
      const courseId = numberField(context.input, "courses[0][id]") ?? 0;
      const key = `${context.user.key}:${courseId}`;
      if (numberField(context.input, "courses[0][favourite]") === 1) context.state.favouriteCourses.add(key);
      else context.state.favouriteCourses.delete(key);
      return [];
    }
    case "core_course_get_contents":
      return sectionsFor(context.user, context.input, context.state, context.siteUrl);
    case "core_completion_get_activities_completion_status":
      return completionFor(context.user, context.input);
    case "core_completion_update_activity_completion_status_manually": {
      const cmid = numberField(context.input, "cmid") ?? 0;
      const key = `${context.user.key}:${cmid}`;
      if (numberField(context.input, "completed") === 1) context.state.completedActivities.add(key);
      else context.state.completedActivities.delete(key);
      return { status: true, warnings: [] };
    }
    case "mod_assign_get_assignments":
      return assignmentsPayload(context.user);
    case "mod_assign_get_submission_status":
      return submissionPayload(context.user, context.input);
    case "mod_assign_save_submission":
      return saveSubmission(context);
    case "mod_assign_submit_for_grading":
      return submitForGrading(context);
    case "message_popup_get_popup_notifications":
      return notificationPayload(context);
    case "message_popup_get_unread_popup_notification_count":
      return context.user.notifications.filter((notification) =>
        !context.state.readNotifications.has(`${context.user.key}:${notification.id}`)
      ).length;
    case "core_message_mark_notification_read": {
      const notificationId = numberField(context.input, "notificationid", "id") ?? 0;
      context.state.readNotifications.add(`${context.user.key}:${notificationId}`);
      return { status: true, warnings: [] };
    }
    default:
      return delegatedPayload(functionName, context);
  }
};

export const handleRestFunction = (
  functionName: MoodleFunction,
  context: RestContext,
): unknown => {
  const payload = context.scenario === "empty_data"
    ? emptyPayload(functionName)
    : successPayload(functionName, context);
  return context.scenario === "warning" ? withWarnings(payload) : payload;
};

export const tokenForUser = (user: FixtureUser): string => FIXTURE_TOKENS[user.key];
