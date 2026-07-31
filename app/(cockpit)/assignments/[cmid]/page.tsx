import { createHash } from "node:crypto";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { resolveMoodlePageFailure, StateNotice } from "@/components/app-shell/state-notice";
import { AssignmentDetailView, AssignmentHtmlFallbackView } from "@/components/assignments/assignment-detail";
import { createAuthenticatedMoodleClient, requireMoodleSession } from "@/lib/auth/server";
import { readHtmlActivityScreen, type HtmlActivityScreen } from "@/lib/moodle/activities/html-screen";
import type { MoodleCourseModuleId } from "@/lib/moodle/identifiers";
import {
  AssignmentNotFoundError,
  MoodleCourseModulePathSchema,
} from "@/lib/moodle/queries/assignments";
import { fetchAssignmentDetail } from "@/lib/moodle/queries/assignments.query";
import { toMoodleReadFailure } from "@/lib/moodle/queries/dashboard";
import { currentUnixSeconds } from "@/lib/moodle/now";
import { readAppRuntimeConfig } from "@/lib/app-config";
import { createAiUiContext } from "@/lib/ai/runtime";

export const metadata: Metadata = { title: "課題" };

type AssignmentPageProps = Readonly<{ params: Promise<{ cmid: string }> }>;

async function AssignmentHtmlFallback({ cmid, session }: Readonly<{
  cmid: MoodleCourseModuleId;
  session: Awaited<ReturnType<typeof requireMoodleSession>>;
}>) {
  let screen: HtmlActivityScreen;
  try {
    screen = await readHtmlActivityScreen({
      cmid,
      instance: null,
      moduleName: "assign",
      siteUrl: session.site.siteUrl,
      userId: session.userId,
    });
  } catch (error) {
    const failure = toMoodleReadFailure(error);
    if (failure.kind === "failure") return <StateNotice reason={resolveMoodlePageFailure(failure.reason)} retryHref={`/assignments/${cmid}`} siteUrl={session.site.siteUrl} />;
    throw error;
  }
  return <AssignmentHtmlFallbackView cmid={cmid} screen={screen.screen} />;
}

export default async function AssignmentPage({ params }: AssignmentPageProps) {
  const session = await requireMoodleSession();
  const config = readAppRuntimeConfig();
  const route = await params;
  const cmid = MoodleCourseModulePathSchema.safeParse(route.cmid);
  if (!cmid.success) {
    notFound();
  }
  if (session.manifest.features.assignmentsRead !== "available") {
    return <AssignmentHtmlFallback cmid={cmid.data} session={session} />;
  }
  let data;
  try {
    data = await fetchAssignmentDetail(
      { client: await createAuthenticatedMoodleClient(), now: currentUnixSeconds(), session },
      cmid.data,
    );
  } catch (error) {
    if (error instanceof AssignmentNotFoundError) {
      notFound();
    }
    const failure = toMoodleReadFailure(error);
    if (failure.kind === "failure") {
      if (failure.reason === "capability" || failure.reason === "invalid_response") {
        return <AssignmentHtmlFallback cmid={cmid.data} session={session} />;
      }
      return <StateNotice reason={resolveMoodlePageFailure(failure.reason)} retryHref={`/assignments/${cmid.data}`} siteUrl={session.site.siteUrl} />;
    }
    throw error;
  }
  const draftStorageKey = `next-moodle:draft:${createHash("sha256")
    .update(`${session.site.siteUrl}|${session.userId}|${cmid.data}`)
    .digest("base64url")}`;
  const ai = createAiUiContext({ siteUrl: session.site.siteUrl, userId: session.userId });
  return (
    <AssignmentDetailView
      aiAvailability={ai.availability}
      aiConsentStorageKey={ai.consentStorageKey}
      config={config}
      data={data}
      draftStorageKey={draftStorageKey}
    />
  );
}
