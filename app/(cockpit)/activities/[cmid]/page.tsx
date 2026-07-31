import type { Metadata } from "next";
import { forbidden, notFound, redirect } from "next/navigation";

import { ActivityWorkspace } from "@/components/activities/activity-workspace";
import { resolveMoodlePageFailure, StateNotice } from "@/components/app-shell/state-notice";
import { readAppRuntimeConfig } from "@/lib/app-config";
import { readChoiceActivity } from "@/lib/moodle/activities/choice";
import { readDatabaseActivity } from "@/lib/moodle/activities/database";
import { readFeedbackActivity } from "@/lib/moodle/activities/feedback";
import { readForumActivity } from "@/lib/moodle/activities/forum";
import { readGlossaryActivity } from "@/lib/moodle/activities/glossary";
import { readLessonActivity } from "@/lib/moodle/activities/lesson";
import type { NativeActivityData } from "@/lib/moodle/activities/native";
import { MoodleResponseError } from "@/lib/moodle/errors";
import { readQuizActivity } from "@/lib/moodle/activities/quiz";
import { readWikiActivity } from "@/lib/moodle/activities/wiki";
import { readWorkshopActivity } from "@/lib/moodle/activities/workshop";
import { MoodleCourseModuleIdSchema } from "@/lib/moodle/identifiers";

import { readActivityPageData } from "./activity-page-data";

export const metadata: Metadata = { title: "アクティビティ" };

type ActivityPageProps = Readonly<{
  params: Promise<{ cmid: string }>;
  searchParams: Promise<{ discussion?: string; feedbackPage?: string; lessonPage?: string; page?: string }>;
}>;

function requireNativeData<T>(data: T | null): T {
  if (data === null) {
    throw new MoodleResponseError();
  }
  return data;
}

export default async function ActivityPage({ params, searchParams }: ActivityPageProps) {
  const route = await params;
  const cmid = MoodleCourseModuleIdSchema.safeParse(Number(route.cmid));
  if (!cmid.success) {
    notFound();
  }
  const { result, session } = await readActivityPageData(cmid.data);
  if (result.kind === "failure") {
    return <StateNotice {...(result.diagnostic === undefined ? {} : { diagnostic: result.diagnostic })} reason={resolveMoodlePageFailure(result.reason)} retryHref={`/activities/${cmid.data}`} siteUrl={session.site.siteUrl} />;
  }
  if (result.data === null) {
    notFound();
  }
  if (result.data.availability !== "available") {
    forbidden();
  }
  if (result.data.moduleType === "assign" && result.data.resolution.kind === "api") {
    redirect(`/assignments/${cmid.data}`);
  }
  const query = await searchParams;
  const requestedPage = Number(query.page ?? "0");
  const requestedDiscussion = Number(query.discussion ?? "0");
  let native: NativeActivityData | undefined;
  if (result.data.moduleType === "quiz" && session.manifest.features.quizzes === "available") {
    const quizResult = await readQuizActivity({
        cmid: cmid.data,
        courseId: result.data.course.id,
        instance: result.data.instance,
        page: Number.isInteger(requestedPage) && requestedPage >= 0 ? requestedPage : 0,
        siteUrl: session.site.siteUrl,
        userId: session.userId,
      });
    if (quizResult.kind === "failure") return <StateNotice reason={resolveMoodlePageFailure(quizResult.reason)} retryHref={`/activities/${cmid.data}`} siteUrl={session.site.siteUrl} />;
    native = { kind: "quiz", data: requireNativeData(quizResult.data) };
  } else if (result.data.moduleType === "forum" && session.manifest.features.forums === "available") {
    const forumResult = await readForumActivity({
      cmid: cmid.data,
      courseId: result.data.course.id,
      instance: result.data.instance,
      manifest: session.manifest,
      selectedDiscussionId: Number.isInteger(requestedDiscussion) && requestedDiscussion > 0 ? requestedDiscussion : null,
      siteUrl: session.site.siteUrl,
    });
    if (forumResult.kind === "failure") return <StateNotice reason={resolveMoodlePageFailure(forumResult.reason)} retryHref={`/activities/${cmid.data}`} siteUrl={session.site.siteUrl} />;
    native = { kind: "forum", data: requireNativeData(forumResult.data) };
  } else if (result.data.moduleType === "choice" && session.manifest.features.choice === "available") {
    const choiceResult = await readChoiceActivity({ cmid: cmid.data, courseId: result.data.course.id, instance: result.data.instance });
    if (choiceResult.kind === "failure") return <StateNotice reason={resolveMoodlePageFailure(choiceResult.reason)} retryHref={`/activities/${cmid.data}`} siteUrl={session.site.siteUrl} />;
    native = { kind: "choice", data: requireNativeData(choiceResult.data) };
  } else if (result.data.moduleType === "glossary" && session.manifest.features.glossary === "available") {
    const glossaryResult = await readGlossaryActivity({ cmid: cmid.data, courseId: result.data.course.id, instance: result.data.instance, siteUrl: session.site.siteUrl });
    if (glossaryResult.kind === "failure") return <StateNotice reason={resolveMoodlePageFailure(glossaryResult.reason)} retryHref={`/activities/${cmid.data}`} siteUrl={session.site.siteUrl} />;
    native = { kind: "glossary", data: requireNativeData(glossaryResult.data) };
  } else if (result.data.moduleType === "wiki" && session.manifest.features.wiki === "available") {
    const wikiResult = await readWikiActivity({ cmid: cmid.data, courseId: result.data.course.id, instance: result.data.instance, siteUrl: session.site.siteUrl });
    if (wikiResult.kind === "failure") return <StateNotice reason={resolveMoodlePageFailure(wikiResult.reason)} retryHref={`/activities/${cmid.data}`} siteUrl={session.site.siteUrl} />;
    native = { kind: "wiki", data: requireNativeData(wikiResult.data) };
  } else if (result.data.moduleType === "feedback" && session.manifest.features.feedback === "available") {
    const feedbackPage = query.feedbackPage === undefined ? null : Number(query.feedbackPage);
    const feedbackResult = await readFeedbackActivity({
      cmid: cmid.data,
      courseId: result.data.course.id,
      instance: result.data.instance,
      page: feedbackPage !== null && Number.isInteger(feedbackPage) && feedbackPage >= 0 ? feedbackPage : null,
    });
    if (feedbackResult.kind === "failure") return <StateNotice reason={resolveMoodlePageFailure(feedbackResult.reason)} retryHref={`/activities/${cmid.data}`} siteUrl={session.site.siteUrl} />;
    native = { kind: "feedback", data: requireNativeData(feedbackResult.data) };
  } else if (result.data.moduleType === "lesson" && session.manifest.features.lesson === "available") {
    const lessonPage = query.lessonPage === undefined ? null : Number(query.lessonPage);
    const lessonResult = await readLessonActivity({
      cmid: cmid.data,
      courseId: result.data.course.id,
      instance: result.data.instance,
      pageId: lessonPage !== null && Number.isInteger(lessonPage) && lessonPage >= 0 ? lessonPage : null,
      siteUrl: session.site.siteUrl,
    });
    if (lessonResult.kind === "failure") return <StateNotice reason={resolveMoodlePageFailure(lessonResult.reason)} retryHref={`/activities/${cmid.data}`} siteUrl={session.site.siteUrl} />;
    native = { kind: "lesson", data: requireNativeData(lessonResult.data) };
  } else if (result.data.moduleType === "data" && session.manifest.features.database === "available") {
    const databaseResult = await readDatabaseActivity({ cmid: cmid.data, courseId: result.data.course.id, instance: result.data.instance, siteUrl: session.site.siteUrl });
    if (databaseResult.kind === "failure") return <StateNotice reason={resolveMoodlePageFailure(databaseResult.reason)} retryHref={`/activities/${cmid.data}`} siteUrl={session.site.siteUrl} />;
    native = { kind: "database", data: requireNativeData(databaseResult.data) };
  } else if (result.data.moduleType === "workshop" && session.manifest.features.workshop === "available") {
    const workshopResult = await readWorkshopActivity({ cmid: cmid.data, courseId: result.data.course.id, instance: result.data.instance, siteUrl: session.site.siteUrl, userId: session.userId });
    if (workshopResult.kind === "failure") return <StateNotice reason={resolveMoodlePageFailure(workshopResult.reason)} retryHref={`/activities/${cmid.data}`} siteUrl={session.site.siteUrl} />;
    native = { kind: "workshop", data: requireNativeData(workshopResult.data) };
  }
  return <ActivityWorkspace
    canUpdateCompletion={session.manifest.features.completionUpdate === "available"}
    config={readAppRuntimeConfig()}
    data={result.data}
    native={native}
  />;
}
