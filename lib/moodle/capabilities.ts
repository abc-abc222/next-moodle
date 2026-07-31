import { createHash } from "node:crypto";
import { z } from "zod";

import { ACTIVITY_MODULE_NAMES, ActivityModuleNameSchema, type ActivityModuleName } from "./capability-contract";
import { MOODLE_FUNCTIONS, MOODLE_KNOWN_FUNCTION_NAMES } from "./functions";

export { ACTIVITY_MODULE_NAMES, ActivityModuleNameSchema, type ActivityModuleName } from "./capability-contract";

export const STUDENT_FEATURE_KEYS = [
  "dashboard", "courses", "resources", "completion", "completionUpdate", "favorites",
  "assignmentsRead", "assignmentsSubmit", "assignmentsFinalize", "assignmentFeedback", "quizzes",
  "forums", "choice", "feedback", "lesson", "glossary", "wiki", "database",
  "workshop", "scorm", "h5p", "lti", "bigBlueButton", "grades", "people",
  "profile", "privateFiles", "badges", "plans", "messages", "contacts",
  "notifications", "notificationPreferences", "calendar", "calendarManage",
] as const;
export const StudentFeatureKeySchema = z.enum(STUDENT_FEATURE_KEYS);
export type StudentFeatureKey = z.infer<typeof StudentFeatureKeySchema>;

export const CAPABILITY_STATES = ["available", "unavailable"] as const;
export const CapabilityStateSchema = z.enum(CAPABILITY_STATES);
export type CapabilityState = z.infer<typeof CapabilityStateSchema>;

export const CAPABILITY_DELIVERIES = ["api", "html"] as const;
export const CapabilityDeliverySchema = z.enum(CAPABILITY_DELIVERIES);
export type CapabilityDelivery = z.infer<typeof CapabilityDeliverySchema>;

export const STUDENT_OPERATION_KEYS = [
  "assignment.save", "assignment.finalize", "calendar.manage", "completion.update", "course.favorite",
  "forum.read", "forum.create", "forum.reply", "forum.edit", "forum.subscribe", "forum.markRead",
  "message.read", "message.sendConversation", "message.sendDirect", "message.markRead", "notification.markRead",
] as const;
export const StudentOperationKeySchema = z.enum(STUDENT_OPERATION_KEYS);
export type StudentOperationKey = z.infer<typeof StudentOperationKeySchema>;

export const MoodleCapabilityManifestSchema = z.object({
  version: z.union([z.literal(3), z.literal(4), z.literal(5)]).transform(() => 5 as const),
  moodleRelease: z.string().min(1).max(120),
  functionHash: z.string().regex(/^[a-f0-9]{64}$/),
  functionBits: z.string().min(1).max(2_048).regex(/^[A-Za-z0-9_-]+$/),
  features: z.record(StudentFeatureKeySchema, CapabilityStateSchema),
  operations: z.record(StudentOperationKeySchema, CapabilityStateSchema),
  activitySupport: z.record(ActivityModuleNameSchema, CapabilityStateSchema),
  fileAccess: z.object({ download: z.boolean(), upload: z.boolean() }),
});
export type MoodleCapabilityManifest = Readonly<z.infer<typeof MoodleCapabilityManifestSchema>>;

type Requirements = Readonly<{ all: readonly string[] }>;

const FEATURE_REQUIREMENTS = {
  dashboard: { all: [MOODLE_FUNCTIONS.timelineCourses, MOODLE_FUNCTIONS.actionEvents] }, courses: { all: [MOODLE_FUNCTIONS.enrolledCourses, MOODLE_FUNCTIONS.courseContents] }, resources: { all: [MOODLE_FUNCTIONS.courseContents] }, completion: { all: [MOODLE_FUNCTIONS.activityCompletion] }, completionUpdate: { all: [MOODLE_FUNCTIONS.updateActivityCompletion] }, favorites: { all: [MOODLE_FUNCTIONS.setFavouriteCourses] }, assignmentsRead: { all: [MOODLE_FUNCTIONS.assignments, MOODLE_FUNCTIONS.assignmentStatus] }, assignmentsSubmit: { all: [MOODLE_FUNCTIONS.saveAssignment] }, assignmentsFinalize: { all: [MOODLE_FUNCTIONS.submitAssignment] }, assignmentFeedback: { all: [MOODLE_FUNCTIONS.assignmentStatus] }, quizzes: { all: [MOODLE_FUNCTIONS.quizzes, MOODLE_FUNCTIONS.quizAttempts, MOODLE_FUNCTIONS.startQuizAttempt, MOODLE_FUNCTIONS.quizAttemptData, MOODLE_FUNCTIONS.saveQuizAttempt, MOODLE_FUNCTIONS.processQuizAttempt, MOODLE_FUNCTIONS.quizAttemptReview] }, forums: { all: [MOODLE_FUNCTIONS.forums, MOODLE_FUNCTIONS.forumDiscussions, MOODLE_FUNCTIONS.forumDiscussionPosts] }, choice: { all: [MOODLE_FUNCTIONS.choices, MOODLE_FUNCTIONS.choiceOptions, MOODLE_FUNCTIONS.submitChoice] }, feedback: { all: [MOODLE_FUNCTIONS.feedbacks, MOODLE_FUNCTIONS.feedbackItems, MOODLE_FUNCTIONS.launchFeedback, MOODLE_FUNCTIONS.feedbackPageItems, MOODLE_FUNCTIONS.submitFeedback] }, lesson: { all: [MOODLE_FUNCTIONS.lessons, MOODLE_FUNCTIONS.launchLessonAttempt, MOODLE_FUNCTIONS.lessonPage, MOODLE_FUNCTIONS.submitLessonAnswer, MOODLE_FUNCTIONS.finishLessonAttempt] }, glossary: { all: [MOODLE_FUNCTIONS.glossaries, MOODLE_FUNCTIONS.glossaryEntries, MOODLE_FUNCTIONS.addGlossaryEntry] }, wiki: { all: [MOODLE_FUNCTIONS.wikis, MOODLE_FUNCTIONS.wikiPages, MOODLE_FUNCTIONS.wikiPageForEditing, MOODLE_FUNCTIONS.saveWikiPage] }, database: { all: [MOODLE_FUNCTIONS.databases, MOODLE_FUNCTIONS.databaseAccess, MOODLE_FUNCTIONS.databaseFields, MOODLE_FUNCTIONS.databaseEntries, MOODLE_FUNCTIONS.addDatabaseEntry] }, workshop: { all: [MOODLE_FUNCTIONS.workshops, MOODLE_FUNCTIONS.workshopAccess, MOODLE_FUNCTIONS.workshopPlan, MOODLE_FUNCTIONS.workshopSubmissions, MOODLE_FUNCTIONS.addWorkshopSubmission, MOODLE_FUNCTIONS.updateWorkshopSubmission] }, scorm: { all: [MOODLE_FUNCTIONS.scorms, MOODLE_FUNCTIONS.scormAttempt] }, h5p: { all: [MOODLE_FUNCTIONS.h5pActivities, MOODLE_FUNCTIONS.h5pState] }, lti: { all: [MOODLE_FUNCTIONS.ltis, MOODLE_FUNCTIONS.ltiLaunchData] }, bigBlueButton: { all: [MOODLE_FUNCTIONS.bigBlueButtons, MOODLE_FUNCTIONS.bigBlueButtonJoin] }, grades: { all: [MOODLE_FUNCTIONS.grades] }, people: { all: [MOODLE_FUNCTIONS.participants] }, profile: { all: [MOODLE_FUNCTIONS.usersByField] }, privateFiles: { all: [MOODLE_FUNCTIONS.privateFiles, MOODLE_FUNCTIONS.files] }, badges: { all: [MOODLE_FUNCTIONS.badges] }, plans: { all: [MOODLE_FUNCTIONS.plans] }, messages: { all: [MOODLE_FUNCTIONS.conversations, MOODLE_FUNCTIONS.conversation] }, contacts: { all: [MOODLE_FUNCTIONS.contacts] }, notifications: { all: [MOODLE_FUNCTIONS.notifications, MOODLE_FUNCTIONS.unreadNotificationCount] }, notificationPreferences: { all: [MOODLE_FUNCTIONS.messagePreferences] }, calendar: { all: [MOODLE_FUNCTIONS.calendarMonthly, MOODLE_FUNCTIONS.calendarUpcoming] }, calendarManage: { all: [MOODLE_FUNCTIONS.calendarEvents, MOODLE_FUNCTIONS.createCalendarEvents, MOODLE_FUNCTIONS.deleteCalendarEvents] },
} as const satisfies Record<StudentFeatureKey, Requirements>;

const OPERATION_REQUIREMENTS = {
  "assignment.save": { all: [MOODLE_FUNCTIONS.saveAssignment] }, "assignment.finalize": { all: [MOODLE_FUNCTIONS.submitAssignment] }, "calendar.manage": { all: [MOODLE_FUNCTIONS.createCalendarEvents, MOODLE_FUNCTIONS.deleteCalendarEvents] }, "completion.update": { all: [MOODLE_FUNCTIONS.updateActivityCompletion] }, "course.favorite": { all: [MOODLE_FUNCTIONS.setFavouriteCourses] }, "forum.read": { all: [MOODLE_FUNCTIONS.forums, MOODLE_FUNCTIONS.forumDiscussions, MOODLE_FUNCTIONS.forumDiscussionPosts] }, "forum.create": { all: [MOODLE_FUNCTIONS.addForumDiscussion] }, "forum.reply": { all: [MOODLE_FUNCTIONS.addForumPost] }, "forum.edit": { all: [MOODLE_FUNCTIONS.updateForumPost] }, "forum.subscribe": { all: [MOODLE_FUNCTIONS.setForumSubscription] }, "forum.markRead": { all: [MOODLE_FUNCTIONS.markForumRead] }, "message.read": { all: [MOODLE_FUNCTIONS.conversations, MOODLE_FUNCTIONS.conversation] }, "message.sendConversation": { all: [MOODLE_FUNCTIONS.sendConversationMessages] }, "message.sendDirect": { all: [MOODLE_FUNCTIONS.sendMessages, MOODLE_FUNCTIONS.conversationBetweenUsers] }, "message.markRead": { all: [MOODLE_FUNCTIONS.markConversationRead] }, "notification.markRead": { all: [MOODLE_FUNCTIONS.markNotificationRead] },
} as const satisfies Record<StudentOperationKey, Requirements>;

const ACTIVITY_FEATURE = {
  assign: "assignmentsRead", quiz: "quizzes", forum: "forums", choice: "choice", feedback: "feedback", lesson: "lesson", glossary: "glossary", wiki: "wiki", data: "database", workshop: "workshop", scorm: "scorm", h5pactivity: "h5p", lti: "lti", bigbluebuttonbn: "bigBlueButton", book: "resources", resource: "resources", folder: "resources", imscp: "resources", page: "resources", url: "resources",
} as const satisfies Record<ActivityModuleName, StudentFeatureKey>;

function stateFor(requirements: Requirements, available: ReadonlySet<string>): CapabilityState {
  return requirements.all.every((name) => available.has(name)) ? "available" : "unavailable";
}

function encodeFunctionBits(available: ReadonlySet<string>): string {
  const bytes = new Uint8Array(Math.ceil(MOODLE_KNOWN_FUNCTION_NAMES.length / 8));
  MOODLE_KNOWN_FUNCTION_NAMES.forEach((name, index) => {
    if (!available.has(name)) return;
    const byteIndex = Math.floor(index / 8);
    const current = bytes[byteIndex];
    if (current !== undefined) bytes[byteIndex] = current | (1 << (index % 8));
  });
  return Buffer.from(bytes).toString("base64url");
}

function functionNamesFromBits(bits: string): ReadonlySet<string> {
  const bytes = Buffer.from(bits, "base64url");
  return new Set(MOODLE_KNOWN_FUNCTION_NAMES.filter((_, index) => {
    const byte = bytes[Math.floor(index / 8)] ?? 0;
    return (byte & (1 << (index % 8))) !== 0;
  }));
}

export function missingRequiredStudentFunctions(manifest: MoodleCapabilityManifest): readonly string[] {
  const available = functionNamesFromBits(manifest.functionBits);
  const required = new Set<string>();
  for (const key of STUDENT_FEATURE_KEYS) if (manifest.features[key] === "unavailable") for (const name of FEATURE_REQUIREMENTS[key].all) required.add(name);
  return [...required].filter((name) => !available.has(name)).sort();
}

export function capabilityForOperation(manifest: MoodleCapabilityManifest, operation: StudentOperationKey): CapabilityState { return manifest.operations[operation]; }
export function featureDeliveryFor(manifest: MoodleCapabilityManifest, feature: StudentFeatureKey): CapabilityDelivery { return manifest.features[feature] === "available" ? "api" : "html"; }
export function activityDeliveryFor(manifest: MoodleCapabilityManifest, moduleName: ActivityModuleName): CapabilityDelivery {
  if (["scorm", "h5pactivity", "lti", "bigbluebuttonbn", "url"].includes(moduleName)) return "html";
  return manifest.activitySupport[moduleName] === "available" ? "api" : "html";
}
export function unknownActivityDelivery(): CapabilityDelivery {
  return "html";
}

export function deriveCapabilityManifest(input: Readonly<{ fileAccess: Readonly<{ download: boolean; upload: boolean }>; functionNames: readonly string[]; moodleRelease?: string }>): MoodleCapabilityManifest {
  const names = [...new Set(input.functionNames)].sort();
  const available: ReadonlySet<string> = new Set(names);
  const features = Object.fromEntries(STUDENT_FEATURE_KEYS.map((key) => [key, stateFor(FEATURE_REQUIREMENTS[key], available)])) as Record<StudentFeatureKey, CapabilityState>;
  const activitySupport = Object.fromEntries(ACTIVITY_MODULE_NAMES.map((moduleName) => [moduleName, features[ACTIVITY_FEATURE[moduleName]]])) as Record<ActivityModuleName, CapabilityState>;
  const operations = Object.fromEntries(STUDENT_OPERATION_KEYS.map((key) => [key, stateFor(OPERATION_REQUIREMENTS[key], available)])) as Record<StudentOperationKey, CapabilityState>;
  return MoodleCapabilityManifestSchema.parse({ version: 5, moodleRelease: input.moodleRelease ?? "unknown", functionHash: createHash("sha256").update(names.join("\n")).digest("hex"), functionBits: encodeFunctionBits(available), features, operations, activitySupport, fileAccess: input.fileAccess });
}
