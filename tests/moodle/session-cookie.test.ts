import { describe, expect, test } from "bun:test";
import { getIronSession } from "iron-session";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

import {
  createSessionOptions,
  parseActiveMoodleSession,
} from "../../lib/auth/session";
import {
  MoodleUserIdSchema,
  type MoodleSession,
} from "../../lib/moodle/model";
import { createSessionFixture } from "./session-fixture";

type SessionContainer = {
  moodle?: MoodleSession;
};

class MemoryCookieStore {
  readonly #values = new Map<string, string>();
  #lastOptions: Partial<ResponseCookie> | undefined;

  get(name: string): { readonly name: string; readonly value: string } | undefined {
    const value = this.#values.get(name);
    return value === undefined ? undefined : { name, value };
  }

  set(name: string, value: string, options?: Partial<ResponseCookie>): void;
  set(options: ResponseCookie): void;
  set(
    nameOrOptions: string | ResponseCookie,
    value?: string,
    options?: Partial<ResponseCookie>,
  ): void {
    if (typeof nameOrOptions !== "string") {
      this.#values.set(nameOrOptions.name, nameOrOptions.value);
      this.#lastOptions = nameOrOptions;
      return;
    }
    if (value !== undefined) {
      this.#values.set(nameOrOptions, value);
      this.#lastOptions = options;
    }
  }

  value(name: string): string | null {
    return this.#values.get(name) ?? null;
  }

  options(): Partial<ResponseCookie> | undefined {
    return this.#lastOptions;
  }
}

const options = createSessionOptions(
  "fixture-session-password-at-least-32-bytes",
);

function fixtureSession(token: string, userId: number): MoodleSession {
  return createSessionFixture({ token, userId });
}

describe("iron-session Moodle cookie", () => {
  test("rejects a legacy session without a schema version", () => {
    // Given
    const legacySession = fixtureSession("fixture-legacy", 40);
    const legacyValue = { ...legacySession, schemaVersion: undefined };

    // When
    const parsed = parseActiveMoodleSession(legacyValue);

    // Then
    expect(parsed).toBeNull();
  });

  test("rejects a version two session after the capability bitset migration", () => {
    // Given
    const legacySession = fixtureSession("fixture-legacy-v2", 43);
    const legacyValue = { ...legacySession, schemaVersion: 2 };

    // When
    const parsed = parseActiveMoodleSession(legacyValue);

    // Then
    expect(parsed).toBeNull();
  });

  test("normalizes a version three capability manifest without logging out an active learner", () => {
    const currentSession = fixtureSession("fixture-legacy-v3", 44);
    const legacyValue = {
      ...currentSession,
      manifest: { ...currentSession.manifest, version: 3 },
    };

    const parsed = parseActiveMoodleSession(legacyValue);

    expect(parsed?.manifest.version).toBe(4);
  });

  test("encrypts each user's token into an isolated secure cookie", async () => {
    // Given
    const firstStore = new MemoryCookieStore();
    const secondStore = new MemoryCookieStore();
    const first = await getIronSession<SessionContainer>(firstStore, options);
    const second = await getIronSession<SessionContainer>(secondStore, options);
    first.moodle = fixtureSession("fixture-user-a", 41);
    second.moodle = fixtureSession("fixture-user-b", 42);

    // When
    await Promise.all([first.save(), second.save()]);
    const firstReloaded = await getIronSession<SessionContainer>(
      firstStore,
      options,
    );
    const secondReloaded = await getIronSession<SessionContainer>(
      secondStore,
      options,
    );

    // Then
    expect(firstReloaded.moodle?.userId).toBe(MoodleUserIdSchema.parse(41));
    expect(secondReloaded.moodle?.userId).toBe(MoodleUserIdSchema.parse(42));
    expect(firstStore.value(options.cookieName)).not.toContain("fixture-user-a");
    expect(secondStore.value(options.cookieName)).not.toContain("fixture-user-b");
    expect(firstStore.options()).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
  });
});
