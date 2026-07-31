import {
  MOODLE_KNOWN_FUNCTION_NAMES,
  type MoodleKnownFunctionName,
} from "../lib/moodle/functions"

export const MOODLE_FUNCTIONS = MOODLE_KNOWN_FUNCTION_NAMES

export type MoodleFunction = MoodleKnownFunctionName

export const MOODLE_SCENARIOS = [
  "success",
  "invalid_credentials",
  "expired_token",
  "missing_capability",
  "empty_data",
  "warning",
  "moodle_exception",
  "transient_outage",
  "malformed_response",
  "protected_file",
  "upload_draft",
  "save_submission",
  "submit_for_grading",
  "notification_read",
] as const

export type MoodleScenario = (typeof MOODLE_SCENARIOS)[number]
export type FixtureUserKey = "alice" | "bob"

export type FixtureCourse = {
  readonly id: number
  readonly shortname: string
  readonly fullname: string
  readonly summary: string
  readonly summaryformat: number
  readonly startdate: number
  readonly enddate: number
  readonly progress: number
  readonly completed: boolean
  readonly visible: boolean
  readonly format: string
  readonly categoryid: number
  readonly viewurl: string
}

export type FixtureModule = {
  readonly id: number
  readonly cmid: number
  readonly name: string
  readonly modname: string
  readonly instance: number
  readonly url?: string
  readonly description?: string
  readonly dates?: readonly Readonly<{ label: string; timestamp: number; dataid?: string }>[]
  readonly contents?: readonly Readonly<{
    filename: string
    fileurl: string
    filesize: number
    mimetype: string
    type: string
  }>[]
  readonly visible: boolean
  readonly uservisible: boolean
  readonly completion: number
  readonly completiondata: Readonly<Record<string, string | number | boolean>>
}

export type FixtureSection = {
  readonly id: number
  readonly name: string
  readonly summary: string
  readonly summaryformat: number
  readonly hiddenbynumsections: boolean
  readonly section: number
  readonly modules: readonly FixtureModule[]
}

export type FixtureEvent = {
  readonly id: number
  readonly name: string
  readonly description: string
  readonly descriptionformat: number
  readonly timestart: number
  readonly timeduration: number
  readonly courseid: number
  readonly eventtype: string
  readonly modname: string
  readonly instance: number
  readonly activityname: string
  readonly action: string
  readonly url: string
}

export type FixtureAssignment = {
  readonly id: number
  readonly cmid: number
  readonly courseid: number
  readonly name: string
  readonly intro: string
  readonly introformat: number
  readonly duedate: number
  readonly allowsubmissionsfromdate: number
  readonly cutoffdate: number
  readonly gradingduedate: number
  readonly nosubmissions: boolean
  readonly submissiondrafts: boolean
  readonly requiresubmissionstatement: boolean
  readonly teamsubmission: boolean
  readonly submissionattachments: number
  readonly maxfilesubmissions: number
  readonly maxsubmissionsizebytes: number
  readonly configs?: readonly Readonly<{
    plugin: string
    subtype: string
    name: string
    value: string | number | boolean
  }>[]
}

export type FixtureSubmission = {
  readonly assignmentid: number
  readonly status: string
  readonly gradingstatus: string
  readonly attemptnumber: number
  readonly timestarted: number
  readonly timemodified: number
  readonly groupid: number
  readonly plugins: readonly Readonly<Record<string, unknown>>[]
}

export type FixtureNotification = {
  readonly id: number
  readonly useridfrom: number
  readonly subject: string
  readonly message: string
  readonly fullmessage: string
  readonly fullmessageformat: number
  readonly contexturl: string
  readonly timecreated: number
  readonly timeread: number
  readonly component: string
  readonly eventtype: string
}

export type FixtureUser = {
  readonly key: FixtureUserKey
  readonly userid: number
  readonly username: string
  readonly password: string
  readonly fullname: string
  readonly firstname: string
  readonly lastname: string
  readonly lang: string
  readonly courses: readonly FixtureCourse[]
  readonly sections: Readonly<Record<string, readonly FixtureSection[]>>
  readonly completion: Readonly<Record<string, readonly Readonly<Record<string, unknown>>[]>>
  readonly events: readonly FixtureEvent[]
  readonly assignments: readonly FixtureAssignment[]
  readonly submissions: readonly FixtureSubmission[]
  readonly notifications: readonly FixtureNotification[]
}

export type MockRequestFile = {
  readonly field: string
  readonly name: string
  readonly type: string
  readonly size: number
  readonly bytes: Uint8Array
}

export type MockRequestInput = {
  readonly fields: ReadonlyMap<string, readonly string[]>
  readonly files: readonly MockRequestFile[]
}

export type MoodleMockOptions = {
  readonly host?: string
  readonly port?: number
  readonly defaultScenario?: MoodleScenario
  readonly missingFunctions?: readonly MoodleFunction[]
}

export type MoodleMockState = {
  readonly completedActivities: Set<string>
  readonly favouriteCourses: Set<string>
  readonly createdEvents: Map<FixtureUserKey, readonly FixtureEvent[]>
  readonly deletedEvents: Set<string>
  readonly tokens: Map<string, FixtureUserKey>
  readonly uiSessions: Map<string, FixtureUserKey>
  readonly questionnaireResponses: Map<string, Readonly<Record<string, readonly string[]>>>
  readonly uploadItems: Map<number, MockUploadItem>
  readonly submissions: Map<string, MockSubmissionState>
  readonly readNotifications: Set<string>
  readonly outageAttempts: Map<string, number>
  readonly sentMessages: Map<string, readonly MockMessageState[]>
  readonly quizAttempts: Map<string, MockQuizAttemptState>
  readonly forumDiscussions: Map<FixtureUserKey, readonly MockForumDiscussionState[]>
  readonly forumPosts: Map<string, readonly MockForumPostState[]>
  readonly forumSubscriptions: Set<string>
  readonly readForumDiscussions: Set<string>
  readonly choiceResponses: Map<string, readonly number[]>
  readonly glossaryEntries: Map<FixtureUserKey, readonly MockGlossaryEntryState[]>
  readonly wikiPages: Map<string, MockWikiPageState>
  readonly feedbackSubmissions: Map<string, Readonly<Record<string, string>>>
  readonly lessonSubmissions: Map<string, Readonly<Record<string, string>>>
  readonly databaseEntries: Map<FixtureUserKey, readonly MockDatabaseEntryState[]>
  readonly workshopSubmissions: Map<FixtureUserKey, MockWorkshopSubmissionState>
  nextCalendarEventId: number
  nextDraftItemId: number
  nextQuizAttemptId: number
  nextForumDiscussionId: number
  nextForumPostId: number
  nextGlossaryEntryId: number
  nextDatabaseEntryId: number
  nextWorkshopSubmissionId: number
}

export type MockDatabaseEntryState = {
  readonly id: number
  readonly label: string
  readonly notes: string
}

export type MockWorkshopSubmissionState = {
  readonly content: string
  readonly id: number
  readonly title: string
}

export type MockGlossaryEntryState = {
  readonly concept: string
  readonly definition: string
  readonly id: number
}

export type MockWikiPageState = {
  readonly content: string
  readonly version: number
}

export type MockMessageState = {
  readonly id: number
  readonly text: string
  readonly timecreated: number
  readonly useridfrom: number
}

export type MockQuizAttemptState = {
  readonly attempt: number
  readonly id: number
  readonly quiz: number
  readonly responses: Readonly<Record<string, string>>
  readonly state: "finished" | "inprogress"
  readonly user: FixtureUserKey
}

export type MockForumDiscussionState = {
  readonly created: number
  readonly discussionId: number
  readonly firstPostId: number
  readonly message: string
  readonly subject: string
}

export type MockForumPostState = {
  readonly created: number
  readonly id: number
  readonly message: string
  readonly subject: string
}

export type MockUploadItem = {
  readonly itemid: number
  readonly user: FixtureUserKey
  readonly filename: string
  readonly filepath: string
  readonly filesize: number
  readonly mimetype: string
}

export type MockSubmissionState = {
  readonly user: FixtureUserKey
  readonly assignmentid: number
  readonly plugindata: Readonly<Record<string, string>>
  readonly submitted: boolean
}

export type MoodleMockServer = {
  readonly url: string
  readonly host: string
  readonly port: number
  readonly tokenFor: (user: FixtureUserKey) => string
}

export type MoodleMock = {
  readonly start: () => Promise<MoodleMockServer>
  readonly stop: () => Promise<void>
  readonly state: MoodleMockState
}

export const DEFAULT_HOST = "127.0.0.1"
export const DEFAULT_PORT = 28765
export const PORT_SCAN_LIMIT = 20
