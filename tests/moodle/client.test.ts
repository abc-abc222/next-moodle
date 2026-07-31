import { describe, expect, test } from "bun:test";
import { z } from "zod";

import { MoodleClient } from "../../lib/moodle/client";
import {
  MoodleAuthError,
  MoodleFunctionError,
  MoodleOutageError,
  MoodleResponseError,
} from "../../lib/moodle/errors";
import {
  createMoodleConfig,
  MOODLE_FUNCTIONS,
  MoodleTokenSchema,
} from "../../lib/moodle/model";
import { jsonResponse, startWireMoodle } from "./wire-fake";

const ValueSchema = z.object({ value: z.string() });

function makeClient(
  baseUrl: string,
  options: {
    readonly timeoutMs?: number;
    readonly availableFunctions?: readonly string[];
  } = {},
): MoodleClient {
  const clientOptions = {
    config: createMoodleConfig({
      baseUrl,
      service: "moodle_mobile_app",
      timeoutMs: options.timeoutMs ?? 500,
    }),
    token: MoodleTokenSchema.parse("fixture-token"),
  };
  return options.availableFunctions === undefined
    ? new MoodleClient(clientOptions)
    : new MoodleClient({
        ...clientOptions,
        availableFunctions: options.availableFunctions,
      });
}

describe("MoodleClient wire behavior", () => {
  test("posts REST calls without putting the token in the URL", async () => {
    // Given
    const moodle = startWireMoodle(() => jsonResponse({ value: "safe" }));

    try {
      // When
      const result = await makeClient(moodle.baseUrl).call(
        MOODLE_FUNCTIONS.siteInfo,
        { courseids: [7, 9] },
        ValueSchema,
      );

      // Then
      expect(result.data.value).toBe("safe");
      expect(moodle.requests).toHaveLength(1);
      expect(moodle.requests[0]?.method).toBe("POST");
      expect(moodle.requests[0]?.path).toBe("/webservice/rest/server.php");
      expect(moodle.requests[0]?.form.get("wsfunction")).toBe(
        MOODLE_FUNCTIONS.siteInfo,
      );
      expect(moodle.requests[0]?.form.get("courseids[0]")).toBe("7");
      expect(new URL(moodle.baseUrl).search).toBe("");
    } finally {
      moodle.close();
    }
  });

  test("maps an HTTP-200 invalid-token exception to a redacted auth error", async () => {
    // Given
    const moodle = startWireMoodle(() =>
      jsonResponse({
        exception: "webservice_access_exception",
        errorcode: "invalidtoken",
        message: "private upstream detail",
        debuginfo: "secret debug detail",
      }),
    );

    try {
      // When
      const outcome = makeClient(moodle.baseUrl).call(
        MOODLE_FUNCTIONS.siteInfo,
        {},
        ValueSchema,
      );

      // Then
      await expect(outcome).rejects.toBeInstanceOf(MoodleAuthError);
      await expect(outcome).rejects.toMatchObject({
        code: "authentication_failed",
        message: "Moodle authentication failed.",
      });
    } finally {
      moodle.close();
    }
  });

  test("returns only structured warning metadata", async () => {
    // Given
    const moodle = startWireMoodle(() =>
      jsonResponse({
        value: "safe",
        warnings: [
          {
            item: "course",
            itemid: 42,
            warningcode: "hidden",
            message: "student-specific warning text",
          },
        ],
      }),
    );

    try {
      // When
      const result = await makeClient(moodle.baseUrl).call(
        MOODLE_FUNCTIONS.siteInfo,
        {},
        ValueSchema,
      );

      // Then
      expect(result.warnings).toEqual([
        { item: "course", itemId: 42, code: "hidden" },
      ]);
      expect(JSON.stringify(result.warnings)).not.toContain("student-specific");
    } finally {
      moodle.close();
    }
  });

  test("retries one transient read failure exactly once", async () => {
    // Given
    const moodle = startWireMoodle((_request, requestNumber) =>
      requestNumber === 1
        ? jsonResponse({ unavailable: true }, 503)
        : jsonResponse({ value: "recovered" }),
    );

    try {
      // When
      const result = await makeClient(moodle.baseUrl).call(
        MOODLE_FUNCTIONS.siteInfo,
        {},
        ValueSchema,
      );

      // Then
      expect(result.data.value).toBe("recovered");
      expect(moodle.requests).toHaveLength(2);
    } finally {
      moodle.close();
    }
  });

  test("does not retry a mutation", async () => {
    // Given
    const moodle = startWireMoodle(() =>
      jsonResponse({ unavailable: true }, 503),
    );

    try {
      // When
      const outcome = makeClient(moodle.baseUrl).call(
        MOODLE_FUNCTIONS.markNotificationRead,
        { notificationid: 1 },
        ValueSchema,
      );

      // Then
      await expect(outcome).rejects.toBeInstanceOf(MoodleOutageError);
      expect(moodle.requests).toHaveLength(1);
    } finally {
      moodle.close();
    }
  });

  test("rejects a function absent from the authenticated service", async () => {
    // Given
    const moodle = startWireMoodle(() => jsonResponse({ value: "unsafe" }));
    const client = makeClient(moodle.baseUrl, {
      availableFunctions: [MOODLE_FUNCTIONS.siteInfo],
    });

    try {
      // When
      const outcome = client.call(
        MOODLE_FUNCTIONS.calendarMonthly,
        {},
        ValueSchema,
      );

      // Then
      await expect(outcome).rejects.toBeInstanceOf(MoodleFunctionError);
      expect(moodle.requests).toHaveLength(0);
    } finally {
      moodle.close();
    }
  });

  test("rejects a response that does not match its Zod schema", async () => {
    // Given
    const moodle = startWireMoodle(() => jsonResponse({ value: 99 }));

    try {
      // When
      let error: unknown;
      try {
        await makeClient(moodle.baseUrl).call(MOODLE_FUNCTIONS.siteInfo, {}, ValueSchema);
      } catch (caught) {
        error = caught;
      }

      // Then
      expect(error).toBeInstanceOf(MoodleResponseError);
      if (!(error instanceof MoodleResponseError)) {
        throw new Error("Expected MoodleResponseError");
      }
      expect(error.code).toBe("invalid_response");
      expect(error.message).toBe("Moodle returned an invalid response.");
      expect(error.diagnostic).toMatchObject({
        functionName: MOODLE_FUNCTIONS.siteInfo,
        issues: [{ code: "invalid_type", expected: "string", path: "value" }],
        phase: "response_schema",
      });
      expect(error.diagnostic?.occurredAt).toBeNumber();
    } finally {
      moodle.close();
    }
  });

  test("times out within the configured test budget and reports an outage", async () => {
    // Given
    const moodle = startWireMoodle(async () => {
      await Bun.sleep(150);
      return jsonResponse({ value: "late" });
    });

    try {
      // When
      const outcome = makeClient(moodle.baseUrl, { timeoutMs: 20 }).call(
        MOODLE_FUNCTIONS.siteInfo,
        {},
        ValueSchema,
      );

      // Then
      await expect(outcome).rejects.toBeInstanceOf(MoodleOutageError);
      expect(moodle.requests).toHaveLength(2);
    } finally {
      moodle.close();
    }
  });

  test("keeps concurrent user tokens isolated", async () => {
    // Given
    const moodle = startWireMoodle((request) =>
      jsonResponse({ value: request.form.get("wstoken") }),
    );
    const config = createMoodleConfig({
      baseUrl: moodle.baseUrl,
      service: "moodle_mobile_app",
      timeoutMs: 500,
    });
    const first = new MoodleClient({
      config,
      token: MoodleTokenSchema.parse("fixture-user-a"),
    });
    const second = new MoodleClient({
      config,
      token: MoodleTokenSchema.parse("fixture-user-b"),
    });

    try {
      // When
      const [firstResult, secondResult] = await Promise.all([
        first.call(MOODLE_FUNCTIONS.siteInfo, {}, ValueSchema),
        second.call(MOODLE_FUNCTIONS.siteInfo, {}, ValueSchema),
      ]);

      // Then
      expect(firstResult.data.value).toBe("fixture-user-a");
      expect(secondResult.data.value).toBe("fixture-user-b");
      expect(moodle.requests).toHaveLength(2);
    } finally {
      moodle.close();
    }
  });
});
