import "server-only";

import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

import { MoodleClient } from "../moodle/client";
import { MoodlePageClient } from "../moodle/page-client";
import { MoodleAuthError, MoodleConfigurationError } from "../moodle/errors";
import type { MoodleSession } from "../moodle/site";
import { IronCookieStoreAdapter } from "./iron-cookie-store";
import { parseActiveMoodleSession, readSessionOptions } from "./session";

type SessionContainer = {
  moodle?: unknown;
};

export async function loadMoodleSession(): Promise<MoodleSession | null> {
  const session = await getIronSession<SessionContainer>(
    new IronCookieStoreAdapter(await cookies()),
    readSessionOptions(),
  );
  return parseActiveMoodleSession(session.moodle);
}

export async function loadOptionalMoodleSession(): Promise<MoodleSession | null> {
  try {
    return await loadMoodleSession();
  } catch (error) {
    if (error instanceof MoodleConfigurationError) {
      return null;
    }
    throw error;
  }
}

export async function saveMoodleSession(data: MoodleSession): Promise<void> {
  const session = await getIronSession<SessionContainer>(
    new IronCookieStoreAdapter(await cookies()),
    readSessionOptions(),
  );
  session.moodle = data;
  await session.save();
}

export async function destroyMoodleSession(): Promise<void> {
  const session = await getIronSession<SessionContainer>(
    new IronCookieStoreAdapter(await cookies()),
    readSessionOptions(),
  );
  session.destroy();
}

export async function requireMoodleSession(): Promise<MoodleSession> {
  const session = await loadMoodleSession();
  if (session === null) {
    throw new MoodleAuthError();
  }
  return session;
}

export async function createAuthenticatedMoodleClient(): Promise<MoodleClient> {
  const session = await requireMoodleSession();
  return new MoodleClient({
    config: {
      baseUrl: session.site.siteUrl,
      service: session.service,
      timeoutMs: 10_000,
    },
    token: session.token,
  });
}

export async function createAuthenticatedMoodlePageClient(): Promise<MoodlePageClient> {
  return new MoodlePageClient(await requireMoodleSession());
}
