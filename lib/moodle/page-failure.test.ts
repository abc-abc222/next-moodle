import { describe, expect, test } from "bun:test";

import { resolveMoodlePageFailure } from "@/components/app-shell/state-notice";

import { dispositionForMoodlePageFailure } from "./page-failure";

describe("Moodle page failure disposition", () => {
  test("sends explicit permission failures to the forbidden boundary", () => {
    expect(dispositionForMoodlePageFailure("permission")).toBe("forbidden");
  });

  test("keeps authentication and capability failures recoverable", () => {
    expect(dispositionForMoodlePageFailure("auth_expired")).toBe("reauthenticate");
    expect(dispositionForMoodlePageFailure("capability")).toBe("capability");
  });

  test("keeps outages and invalid responses recoverable", () => {
    expect(dispositionForMoodlePageFailure("outage")).toBe("recoverable");
    expect(dispositionForMoodlePageFailure("invalid_response")).toBe("recoverable");
    expect(resolveMoodlePageFailure("outage")).toBe("outage");
    expect(resolveMoodlePageFailure("invalid_response")).toBe("invalid_response");
  });
});
