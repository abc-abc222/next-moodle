import type { Metadata } from "next";

import { resolveMoodlePageFailure, StateNotice } from "@/components/app-shell/state-notice";
import { PageFrame, RouteHeader } from "@/components/app-shell/workspace-frame";
import { CalendarView } from "@/components/calendar/calendar-view";
import { requireMoodleSession } from "@/lib/auth/server";
import {
  parseCalendarSelection,
  readCalendar,
} from "@/lib/moodle/queries/calendar";
import { currentUnixSeconds } from "@/lib/moodle/now";
import { readAppRuntimeConfig } from "@/lib/app-config";
import { shouldUseHtmlDelivery, StudentHtmlScreen } from "@/components/student/student-html-screen";

export const metadata: Metadata = { title: "カレンダー" };

type CalendarPageProps = Readonly<{
  searchParams: Promise<Readonly<Record<string, string | string[] | undefined>>>;
}>;

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const session = await requireMoodleSession();
  const config = readAppRuntimeConfig();
  if (session.manifest.features.calendar !== "available") {
    return <StudentHtmlScreen description={`学習予定を${config.timeZone}で確認します。`} session={session} surface="calendar" title="カレンダー" />;
  }
  const nowSeconds = currentUnixSeconds();
  const selection = parseCalendarSelection(await searchParams, nowSeconds, config.timeZone);
  const result = await readCalendar(session.userId, selection, nowSeconds, config.timeZone);
  if (result.kind === "failure" && shouldUseHtmlDelivery(result.reason)) return <StudentHtmlScreen description={`学習予定を${config.timeZone}で確認します。`} session={session} surface="calendar" title="カレンダー" />;
  return result.kind === "ready" ? (
    <CalendarView canManage={session.manifest.features.calendarManage === "available"} config={config} data={result.data} />
  ) : (
    <PageFrame content={<StateNotice reason={resolveMoodlePageFailure(result.reason)} retryHref="/calendar" siteUrl={session.site.siteUrl} />} header={<RouteHeader description={`学習予定を${config.timeZone}で確認します。`} eyebrow="予定" title="カレンダー" />} mode="overview" />
  );
}
