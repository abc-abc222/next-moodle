import { deriveCapabilityManifest } from "@/lib/moodle/capabilities";
import {
  MoodleSessionSchema,
  type MoodleSession,
} from "@/lib/moodle/site";

type SessionFixtureOptions = Readonly<{
  expiresAt?: number;
  functions?: readonly string[];
  siteUrl?: string;
  token?: string;
  upload?: boolean;
  userId?: number;
}>;

export function createSessionFixture(
  options: SessionFixtureOptions = {},
): MoodleSession {
  const functions = options.functions ?? [];
  return MoodleSessionSchema.parse({
    schemaVersion: 4,
    token: options.token ?? "fixture-token",
    service: "fixture_service",
    userId: options.userId ?? 101,
    expiresAt: options.expiresAt ?? Date.now() + 60_000,
    site: {
      siteName: "Example Learning Hub",
      siteUrl: options.siteUrl ?? "https://moodle.example",
    },
    manifest: deriveCapabilityManifest({
      fileAccess: {
        download: true,
        upload: options.upload ?? false,
      },
      functionNames: functions,
    }),
    uiSession: {
      cookieName: "MoodleSession",
      cookieValue: "fixture-ui-session",
      expiresAt: options.expiresAt ?? Date.now() + 60_000,
    },
  });
}
