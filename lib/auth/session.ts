import type { SessionOptions } from "iron-session";
import { z } from "zod";

import { MoodleConfigurationError } from "../moodle/errors";
import type { MoodleLogin } from "../moodle/auth";
import {
  MoodleSessionSchema,
  type MoodleSession,
} from "../moodle/site";

export const SESSION_TTL_SECONDS = 8 * 60 * 60;
export const SESSION_COOKIE_NAME = "__Host-next-moodle";
const LOCAL_E2E_SESSION_COOKIE_NAME = "next-moodle-e2e";

const SessionPasswordSchema = z.string().superRefine((value, context) => {
  if (new TextEncoder().encode(value).byteLength < 32) {
    context.addIssue({ code: "custom", message: "Password is too short" });
  }
});

export function createSessionOptions(
  password: string,
  secure = true,
): SessionOptions {
  const parsed = SessionPasswordSchema.safeParse(password);
  if (!parsed.success) {
    throw new MoodleConfigurationError();
  }
  return {
    password: parsed.data,
    cookieName: secure ? SESSION_COOKIE_NAME : LOCAL_E2E_SESSION_COOKIE_NAME,
    ttl: SESSION_TTL_SECONDS,
    cookieOptions: {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
    },
  };
}

export function readSessionOptions(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): SessionOptions {
  const password = environment.SESSION_PASSWORD;
  if (password === undefined) {
    throw new MoodleConfigurationError();
  }
  const isLocalE2eHarness =
    environment.NODE_ENV === "development" &&
    environment.NEXT_MOODLE_E2E_INSECURE_COOKIE === "1";
  return createSessionOptions(password, !isLocalE2eHarness);
}

export function createMoodleSession(
  login: MoodleLogin,
  now = Date.now(),
): MoodleSession {
  return MoodleSessionSchema.parse({
    schemaVersion: 4,
    token: login.token,
    service: login.service,
    userId: login.userId,
    expiresAt: now + SESSION_TTL_SECONDS * 1_000,
    site: login.site,
    manifest: login.manifest,
    uiSession: login.uiSession,
  });
}

export function parseActiveMoodleSession(
  value: unknown,
  now = Date.now(),
): MoodleSession | null {
  const parsed = MoodleSessionSchema.safeParse(value);
  if (!parsed.success || parsed.data.expiresAt <= now || parsed.data.uiSession.expiresAt <= now) {
    return null;
  }
  return parsed.data;
}
