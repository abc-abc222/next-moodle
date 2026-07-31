import { z } from "zod";

import {
  MoodleAssignmentIdSchema,
  MoodleCalendarEventIdSchema,
  MoodleCourseIdSchema,
  MoodleCourseModuleIdSchema,
  MoodleNotificationIdSchema,
  MoodleSectionIdSchema,
} from "./identifiers";

const MoodleTextSchema = z.string().max(16_384);
const MoodleHtmlSchema = z.string().max(1_000_000);
const MoodleTimestampSchema = z.number().int().nonnegative();
const MoodleVisibilitySchema = z.union([
  z.number().int().min(0).max(1),
  z.boolean().transform((visible) => (visible ? 1 : 0)),
  z.literal("0").transform(() => 0),
  z.literal("1").transform(() => 1),
]);

export const MoodleDashboardCourseSchema = z.object({
  id: MoodleCourseIdSchema,
  fullname: MoodleTextSchema,
  shortname: MoodleTextSchema,
  visible: MoodleVisibilitySchema.optional(),
  startdate: MoodleTimestampSchema.optional(),
  enddate: MoodleTimestampSchema.optional(),
  isfavourite: z.union([z.boolean(), z.literal(0), z.literal(1)]).transform(Boolean).optional().default(false),
});
export type MoodleDashboardCourse = Readonly<
  z.infer<typeof MoodleDashboardCourseSchema>
>;

const MoodleCourseModuleModelSchema = z.object({
  id: MoodleCourseModuleIdSchema,
  instance: z.number().int().nonnegative().optional(),
  name: MoodleTextSchema,
  modname: z.string().min(1).max(128),
  integrity: z.enum(["ready", "malformed"]),
  url: z.url().optional(),
  visible: MoodleVisibilitySchema.optional(),
  uservisible: z.boolean().optional(),
  description: MoodleHtmlSchema.optional(),
  availabilityinfo: MoodleHtmlSchema.optional(),
  completion: z.number().int().nonnegative().optional(),
  completiondata: z.object({
    state: z.number().int().nonnegative(),
    timecompleted: MoodleTimestampSchema.optional(),
    overrideby: z.number().int().nonnegative().optional(),
  }).optional(),
  dates: z.array(z.object({
    label: MoodleTextSchema,
    timestamp: MoodleTimestampSchema,
    dataid: z.string().max(128).optional(),
  })).optional(),
  contents: z.array(z.object({
    filename: MoodleTextSchema,
    filepath: z.string().max(2_048).nullish().transform((value) => value ?? undefined),
    filesize: z.number().int().nonnegative().optional(),
    fileurl: z.url().optional(),
    mimetype: z.string().max(256).optional(),
    type: z.string().max(128).optional(),
  })).optional(),
});

const MoodleBooleanSchema = z.union([
  z.boolean(),
  z.literal(0).transform(() => false),
  z.literal(1).transform(() => true),
]);

const MoodleCourseModuleWireSchema = MoodleCourseModuleModelSchema
  .omit({ integrity: true })
  .extend({
    availabilityinfo: MoodleHtmlSchema.nullish().transform((value) => value ?? undefined),
    description: MoodleHtmlSchema.nullish().transform((value) => value ?? undefined),
    url: z.url().nullish().transform((value) => value ?? undefined),
    uservisible: MoodleBooleanSchema.nullish().transform((value) => value ?? undefined),
  })
  .transform((module) => MoodleCourseModuleModelSchema.parse({
    ...module,
    integrity: "ready",
  }));

const MoodleCourseModuleFallbackSchema = z.object({
  id: MoodleCourseModuleIdSchema,
  name: MoodleTextSchema,
  modname: z.string().min(1).max(128),
  visible: MoodleVisibilitySchema.optional(),
  uservisible: MoodleBooleanSchema.nullish().transform((value) => value ?? undefined),
}).transform((module) => MoodleCourseModuleModelSchema.parse({
  ...module,
  integrity: "malformed",
}));

export const MoodleCourseModuleSchema = z.union([
  MoodleCourseModuleWireSchema,
  MoodleCourseModuleFallbackSchema,
]);
export type MoodleCourseModule = Readonly<
  z.infer<typeof MoodleCourseModuleSchema>
>;

export const MoodleCourseSectionSchema = z.object({
  id: MoodleSectionIdSchema,
  name: MoodleTextSchema,
  visible: MoodleVisibilitySchema.nullish().transform((value) => value ?? undefined),
  summary: MoodleHtmlSchema.nullish().transform((value) => value ?? undefined),
  // Empty sections are returned as null by some Moodle plugins instead of [].
  modules: z.array(MoodleCourseModuleSchema).nullish().transform((value) => value ?? []),
});
export type MoodleCourseSection = Readonly<
  z.infer<typeof MoodleCourseSectionSchema>
>;

export const MoodleAssignmentSchema = z.object({
  id: MoodleAssignmentIdSchema,
  cmid: MoodleCourseModuleIdSchema,
  course: MoodleCourseIdSchema,
  name: MoodleTextSchema,
  intro: MoodleHtmlSchema.optional(),
  allowsubmissionsfromdate: MoodleTimestampSchema,
  duedate: MoodleTimestampSchema,
  cutoffdate: MoodleTimestampSchema,
  nosubmissions: z.number().int().min(0).max(1),
  submissiondrafts: z.number().int().min(0).max(1),
  requiresubmissionstatement: z.number().int().min(0).max(1),
  teamsubmission: z.number().int().min(0).max(1),
});
export type MoodleAssignment = Readonly<
  z.infer<typeof MoodleAssignmentSchema>
>;

const MoodleCalendarEventWireSchema = z.object({
  id: MoodleCalendarEventIdSchema,
  name: MoodleTextSchema,
  description: MoodleHtmlSchema.optional(),
  eventtype: z.string().min(1).max(128).optional(),
  normalisedeventtype: z.string().min(1).max(128).optional(),
  timestart: MoodleTimestampSchema,
  timeduration: MoodleTimestampSchema,
  courseid: z.union([z.literal(0), MoodleCourseIdSchema]).optional(),
  cmid: MoodleCourseModuleIdSchema.optional(),
  modname: z.string().max(128).optional(),
});
export const MoodleCalendarEventSchema = MoodleCalendarEventWireSchema.transform(
  ({ eventtype, normalisedeventtype, ...event }) => ({
    ...event,
    eventtype: eventtype ?? normalisedeventtype ?? "other",
  }),
);
export type MoodleCalendarEvent = Readonly<
  z.infer<typeof MoodleCalendarEventSchema>
>;

export const MoodleNotificationSchema = z.object({
  id: MoodleNotificationIdSchema,
  subject: MoodleTextSchema,
  smallmessage: MoodleTextSchema.nullish().transform((message) => message ?? ""),
  fullmessage: MoodleTextSchema.nullish().transform((message) => message ?? undefined),
  fullmessagehtml: MoodleHtmlSchema.nullish().transform((message) => message ?? undefined),
  timecreated: MoodleTimestampSchema,
  timeread: MoodleTimestampSchema.nullish().transform((time) => time ?? 0),
  contexturl: z.url().nullish().transform((url) => url ?? undefined),
});
export type MoodleNotification = Readonly<
  z.infer<typeof MoodleNotificationSchema>
>;

export const MoodleTimelineCoursesResponseSchema = z.object({
  courses: z.array(MoodleDashboardCourseSchema),
  nextoffset: z.number().int().nonnegative(),
});

export const MoodleEnrolledCoursesResponseSchema = z.array(
  MoodleDashboardCourseSchema,
);

export const MoodleCourseSectionsResponseSchema = z.array(
  MoodleCourseSectionSchema,
);

export const MoodleAssignmentsResponseSchema = z.object({
  courses: z.array(
    z.object({
      id: MoodleCourseIdSchema,
      fullname: MoodleTextSchema,
      assignments: z.array(MoodleAssignmentSchema),
    }),
  ),
});

export const MoodleCalendarEventsResponseSchema = z.object({
  events: z.array(MoodleCalendarEventSchema),
});

export const MoodleCalendarUpcomingResponseSchema = z.object({
  events: z.array(MoodleCalendarEventSchema),
});

export const MoodleCalendarMonthlyResponseSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  events: z.array(MoodleCalendarEventSchema),
});

export const MoodleNotificationsResponseSchema = z.object({
  notifications: z.array(MoodleNotificationSchema),
});

const MoodleUnreadNotificationCountObjectSchema = z.object({
  count: z.number().int().nonnegative(),
});
export const MoodleUnreadNotificationCountSchema = z.union([
  MoodleUnreadNotificationCountObjectSchema,
  z.number().int().nonnegative().transform((count) => ({ count })),
]);
