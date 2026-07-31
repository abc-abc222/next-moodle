import type { MoodleReadFailureReason } from "./queries/dashboard";

export type MoodlePageFailureDisposition =
  | "capability"
  | "forbidden"
  | "reauthenticate"
  | "recoverable";

export function dispositionForMoodlePageFailure(
  reason: MoodleReadFailureReason,
): MoodlePageFailureDisposition {
  switch (reason) {
    case "auth_expired":
      return "reauthenticate";
    case "capability":
      return "capability";
    case "permission":
      return "forbidden";
    case "invalid_response":
    case "outage":
      return "recoverable";
  }
}
