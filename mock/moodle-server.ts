import { FIXTURE_TOKENS } from "./fixtures"
import { handleMoodleRequest } from "./router"
import {
  DEFAULT_HOST,
  DEFAULT_PORT,
  PORT_SCAN_LIMIT,
} from "./types"
import type {
  FixtureUserKey,
  MoodleMock,
  MoodleMockOptions,
  MoodleMockServer,
  MoodleMockState,
} from "./types"

type MockServer = {
  readonly port: number
  readonly stop: (closeActiveConnections?: boolean) => Promise<void> | void
}

type BunRuntime = {
  readonly serve: (options: {
    readonly hostname: string
    readonly port: number
    readonly fetch: (request: Request) => Response | Promise<Response>
  }) => MockServer
}

declare const Bun: BunRuntime

export class MockPortAllocationError extends Error {
  readonly name = "MockPortAllocationError"

  constructor(readonly host: string, readonly firstPort: number, readonly attempts: number) {
    super(`no free mock Moodle port in ${host}:${firstPort}-${firstPort + attempts - 1}`)
  }
}

const createState = (): MoodleMockState => ({
  completedActivities: new Set(),
  favouriteCourses: new Set(),
  createdEvents: new Map(),
  deletedEvents: new Set(),
  tokens: new Map([
    [FIXTURE_TOKENS.alice, "alice"],
    [FIXTURE_TOKENS.bob, "bob"],
  ]),
  uiSessions: new Map(),
  questionnaireResponses: new Map(),
  uploadItems: new Map(),
  submissions: new Map(),
  readNotifications: new Set(),
  outageAttempts: new Map(),
  sentMessages: new Map(),
  quizAttempts: new Map(),
  forumDiscussions: new Map(),
  forumPosts: new Map(),
  forumSubscriptions: new Set(),
  readForumDiscussions: new Set(),
  choiceResponses: new Map(),
  glossaryEntries: new Map(),
  wikiPages: new Map(),
  feedbackSubmissions: new Map(),
  lessonSubmissions: new Map(),
  databaseEntries: new Map(),
  workshopSubmissions: new Map(),
  nextCalendarEventId: 9000,
  nextDraftItemId: 7000,
  nextQuizAttemptId: 8000,
  nextForumDiscussionId: 8200,
  nextForumPostId: 8300,
  nextGlossaryEntryId: 8400,
  nextDatabaseEntryId: 8500,
  nextWorkshopSubmissionId: 8600,
})

export const createMoodleMock = (options: MoodleMockOptions = {}): MoodleMock => {
  const host = options.host ?? DEFAULT_HOST
  const state = createState()
  let active: MockServer | undefined

  const start = async (): Promise<MoodleMockServer> => {
    if (active !== undefined) {
      return {
        url: `http://${host}:${active.port}`,
        host,
        port: active.port,
        tokenFor: (user: FixtureUserKey): string => FIXTURE_TOKENS[user],
      }
    }
    const firstPort = options.port ?? DEFAULT_PORT
    const candidates = options.port === undefined
      ? Array.from({ length: PORT_SCAN_LIMIT }, (_, index) => firstPort + index)
      : [firstPort]
    let attempts = 0
    for (const port of candidates) {
      attempts += 1
      try {
        active = Bun.serve({
          hostname: host,
          port,
          fetch: (request: Request): Promise<Response> => handleMoodleRequest(request, state, options),
        })
        return {
          url: `http://${host}:${active.port}`,
          host,
          port: active.port,
          tokenFor: (user: FixtureUserKey): string => FIXTURE_TOKENS[user],
        }
      } catch (error) {
        if (options.port !== undefined) throw error
        if (!(error instanceof Error)) throw error
      }
    }
    throw new MockPortAllocationError(host, firstPort, attempts)
  }

  const stop = async (): Promise<void> => {
    const server = active
    active = undefined
    if (server !== undefined) await server.stop(true)
  }

  return { start, stop, state }
}
