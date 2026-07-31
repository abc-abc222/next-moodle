import type { Metadata } from "next";
import { forbidden } from "next/navigation";

import {
  createAuthenticatedMoodleClient,
  requireMoodleSession,
} from "@/lib/auth/server";
import {
  MoodleAuthError,
  MoodleConfigurationError,
  MoodleFunctionError,
  MoodleOutageError,
  MoodlePermissionError,
  MoodleResponseError,
} from "@/lib/moodle/errors";
import { loadNotifications } from "@/lib/moodle/queries/notifications";
import type { NotificationsPageState } from "@/lib/moodle/queries/notifications-schema";

import { NotificationsClient } from "@/components/notifications/notifications-client";
import { StudentHtmlScreen } from "@/components/student/student-html-screen";
import { readAppRuntimeConfig } from "@/lib/app-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "通知",
  description: "Moodleから届くフィードバックやお知らせを確認します。",
};

function stateFromError(error: Error): NotificationsPageState {
  if (error instanceof MoodleAuthError) {
    return { kind: "auth" };
  }
  if (error instanceof MoodlePermissionError) {
    forbidden();
  }
  if (error instanceof MoodleFunctionError) {
    return { kind: "capability" };
  }
  if (
    error instanceof MoodleOutageError ||
    error instanceof MoodleResponseError ||
    error instanceof MoodleConfigurationError
  ) {
    throw error;
  }
  throw error;
}

export default async function NotificationsPage() {
  const runtimeConfig = readAppRuntimeConfig();
  const session = await requireMoodleSession();
  if (session.manifest.features.notifications !== "available") {
    return <StudentHtmlScreen description="フィードバックやお知らせを確認します。" session={session} surface="notifications" title="通知" />;
  }
  let initialState: NotificationsPageState;
  let useHtml = false;
  try {
    const client = await createAuthenticatedMoodleClient();
    initialState = {
      kind: "ready",
      data: await loadNotifications(
        client,
        session.userId,
        session.site.siteUrl,
      ),
    };
  } catch (error) {
    if (error instanceof MoodleFunctionError || error instanceof MoodleResponseError) {
      useHtml = true;
      initialState = { kind: "capability" };
    } else if (error instanceof Error) {
      initialState = stateFromError(error);
    } else {
      throw error;
    }
  }
  if (useHtml) return <StudentHtmlScreen description="フィードバックやお知らせを確認します。" session={session} surface="notifications" title="通知" />;
  return <NotificationsClient initialState={initialState} runtimeConfig={runtimeConfig} />;
}
