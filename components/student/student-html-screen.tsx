import { StateNotice } from "@/components/app-shell/state-notice";
import { PageFrame, RouteHeader } from "@/components/app-shell/workspace-frame";
import { MoodleScreenWorkspace } from "@/components/activities/html-activity-workspace";
import { MoodlePageError } from "@/lib/moodle/page-contracts";
import { MoodleAuthError, MoodleFunctionError, MoodleOutageError, MoodlePermissionError } from "@/lib/moodle/errors";
import type { MoodleSession } from "@/lib/moodle/site";
import { readStudentHtmlScreen, type StudentHtmlSurface } from "@/lib/moodle/student-html-screen";
import type { MoodleReadFailureReason } from "@/lib/moodle/queries/dashboard";

export function shouldUseHtmlDelivery(reason: MoodleReadFailureReason): boolean {
  return reason === "capability" || reason === "invalid_response";
}

function failureReason(code: MoodlePageError["code"]): "auth_expired" | "capability" | "invalid_response" | "outage" {
  if (code === "reauth_required") return "auth_expired";
  if (code === "forbidden") return "capability";
  if (code === "transient_failure") return "outage";
  return "invalid_response";
}

export async function StudentHtmlScreen({ description, session, surface, title }: Readonly<{
  description: string;
  session: MoodleSession;
  surface: StudentHtmlSurface;
  title: string;
}>) {
  let outcome: Readonly<{ kind: "ready"; screen: Awaited<ReturnType<typeof readStudentHtmlScreen>>["projection"]["screen"] }> | Readonly<{ code: MoodlePageError["code"]; kind: "failure" }>;
  try {
    const { projection } = await readStudentHtmlScreen(session, surface);
    outcome = { kind: "ready", screen: projection.screen };
  } catch (error) {
    if (error instanceof MoodlePageError) {
      outcome = { code: error.code, kind: "failure" };
    } else if (error instanceof MoodleAuthError) {
      outcome = { code: "reauth_required", kind: "failure" };
    } else if (error instanceof MoodlePermissionError || error instanceof MoodleFunctionError) {
      outcome = { code: "forbidden", kind: "failure" };
    } else if (error instanceof MoodleOutageError) {
      outcome = { code: "transient_failure", kind: "failure" };
    } else if (error instanceof Error) {
      outcome = { code: "upstream_changed", kind: "failure" };
    } else {
      throw error;
    }
  }
  const content = outcome.kind === "ready"
    ? <MoodleScreenWorkspace actionEndpoint={`/api/moodle-screen/${surface}/action`} kicker="HTML workspace" screen={outcome.screen} />
    : <StateNotice reason={failureReason(outcome.code)} retryHref={`/${surface === "profile-edit" ? "profile/edit" : surface}`} siteUrl={session.site.siteUrl} />;
  return <PageFrame content={content} header={<RouteHeader description={description} eyebrow="アプリ内変換" title={title} />} mode="overview" />;
}
