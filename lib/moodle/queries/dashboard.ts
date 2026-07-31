import "server-only";

import { cache } from "react";

import {
  MOODLE_FUNCTIONS,
  MoodleAuthError,
  MoodleCalendarEventsResponseSchema,
  MoodleConfigurationError,
  MoodleEnrolledCoursesResponseSchema,
  MoodleFunctionError,
  MoodleInputError,
  MoodleOutageError,
  MoodlePermissionError,
  MoodleResponseError,
  type MoodleResponseDiagnostic,
  MoodleTimelineCoursesResponseSchema,
  MoodleUnreadNotificationCountSchema,
  type MoodleUserId,
} from "@/lib/moodle/server";
import { MoodlePageError } from "@/lib/moodle/page-contracts";
import { createAuthenticatedMoodleClient } from "@/lib/auth/server";
import { projectDashboard, type DashboardProjection } from "./dashboard-model";

export type MoodleReadFailureReason =
  | "auth_expired"
  | "capability"
  | "invalid_response"
  | "outage"
  | "permission";

export type MoodleReadResult<T> =
  | { readonly kind: "ready"; readonly data: T }
  | {
    readonly diagnostic?: MoodleResponseDiagnostic;
    readonly kind: "failure";
    readonly reason: MoodleReadFailureReason;
  };

export function toMoodleReadFailure(error: unknown): MoodleReadResult<never> {
  if (error instanceof MoodlePageError) {
    if (error.code === "reauth_required") return { kind: "failure", reason: "auth_expired" };
    if (error.code === "forbidden") return { kind: "failure", reason: "permission" };
    if (error.code === "transient_failure") return { kind: "failure", reason: "outage" };
    return { kind: "failure", reason: "invalid_response" };
  }
  if (error instanceof MoodleAuthError) {
    return { kind: "failure", reason: "auth_expired" };
  }
  if (error instanceof MoodlePermissionError) {
    return { kind: "failure", reason: "permission" };
  }
  if (error instanceof MoodleFunctionError) {
    return { kind: "failure", reason: "capability" };
  }
  if (error instanceof MoodleOutageError || error instanceof MoodleConfigurationError) {
    return { kind: "failure", reason: "outage" };
  }
  if (error instanceof MoodleResponseError || error instanceof MoodleInputError) {
    return {
      ...(error instanceof MoodleResponseError && error.diagnostic !== undefined
        ? { diagnostic: error.diagnostic }
        : {}),
      kind: "failure",
      reason: "invalid_response",
    };
  }
  throw error;
}

export const readDashboard = cache(
  async (
    userId: MoodleUserId,
    nowSeconds: number,
    timeZone: string,
  ): Promise<MoodleReadResult<DashboardProjection>> => {
    try {
      const client = await createAuthenticatedMoodleClient();
      const [enrolled, timeline, events, unread] = await Promise.all([
        client.call(
          MOODLE_FUNCTIONS.enrolledCourses,
          { userid: userId },
          MoodleEnrolledCoursesResponseSchema,
        ),
        client.call(
          MOODLE_FUNCTIONS.timelineCourses,
          {
            classification: "all",
            limit: 0,
            offset: 0,
            sort: "ul.timeaccess desc",
          },
          MoodleTimelineCoursesResponseSchema,
        ),
        client.call(
          MOODLE_FUNCTIONS.actionEvents,
          {
            aftereventid: 0,
            limitnum: 50,
            timesortfrom: 0,
            timesortto: nowSeconds + 7 * 86_400,
          },
          MoodleCalendarEventsResponseSchema,
        ),
        client.call(
          MOODLE_FUNCTIONS.unreadNotificationCount,
          { useridto: userId },
          MoodleUnreadNotificationCountSchema,
        ),
      ]);
      return {
        kind: "ready",
        data: projectDashboard({
          enrolled: enrolled.data,
          events: events.data.events,
          nowSeconds,
          timeZone,
          timeline: timeline.data.courses,
          unreadCount: unread.data.count,
        }),
      };
    } catch (error) {
      return toMoodleReadFailure(error);
    }
  },
);
