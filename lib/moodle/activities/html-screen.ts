import "server-only";

import type { AnyNode, Element } from "domhandler";
import { DomUtils, parseDocument } from "htmlparser2";

import { createAuthenticatedMoodlePageClient } from "@/lib/auth/server";
import { sanitizeMoodlePageHtml } from "@/lib/security/html";

import type { MoodleCourseModuleId, MoodleUserId } from "../identifiers";
import type { MoodleScreenModel } from "../page-model";
import { parseMoodlePage, type MoodlePageProjection } from "../page-parser";
import type { AttendanceScreenSummary, PublicHtmlActivityScreen, QuestionnaireReportItem } from "./html-screen-model";
import { parseQuestionnaireReport } from "./questionnaire-report";

export type { AttendanceScreenSummary, PublicHtmlActivityScreen, QuestionnaireReportItem } from "./html-screen-model";

export type HtmlActivityScreen =
  | Readonly<{ kind: "generic"; moduleName: string; projection: MoodlePageProjection; screen: MoodleScreenModel }>
  | Readonly<{ attendance: AttendanceScreenSummary; kind: "attendance"; projection: MoodlePageProjection; screen: MoodleScreenModel }>
  | Readonly<{
    kind: "questionnaire";
    mode: "closed" | "report" | "respond" | "summary";
    projection: MoodlePageProjection;
    report: readonly QuestionnaireReportItem[];
    screen: MoodleScreenModel;
    submittedAt: string | null;
  }>;

export function publicHtmlActivityScreen(screen: HtmlActivityScreen): PublicHtmlActivityScreen {
  if (screen.kind === "generic") {
    return { kind: screen.kind, moduleName: screen.moduleName, screen: screen.screen };
  }
  if (screen.kind === "attendance") {
    return { attendance: screen.attendance, kind: screen.kind, screen: screen.screen };
  }
  return {
    kind: screen.kind,
    mode: screen.mode,
    report: screen.report,
    screen: screen.screen,
    submittedAt: screen.submittedAt,
  };
}

type HtmlActivityRequest = Readonly<{
  cmid: MoodleCourseModuleId;
  instance: number | null;
  moduleName: string;
  siteUrl: string;
  userId: MoodleUserId;
}>;

function isElement(node: AnyNode): node is Element {
  return node.type === "tag";
}

function descendants(node: AnyNode, predicate: (element: Element) => boolean): Element[] {
  const matches: Element[] = [];
  const visit = (candidate: AnyNode): void => {
    if (isElement(candidate) && predicate(candidate)) matches.push(candidate);
    if ("children" in candidate) candidate.children.forEach(visit);
  };
  visit(node);
  return matches;
}

function text(node: AnyNode): string {
  return DomUtils.textContent(node).replaceAll("\u00a0", " ").replace(/\s+/g, " ").trim();
}

function safeModuleName(value: string): string {
  return /^[a-z][a-z0-9_]{0,63}$/.test(value) ? value : "page";
}

function questionnaireDestination(html: string, siteUrl: string): "complete" | "report" | null {
  const sanitized = sanitizeMoodlePageHtml(html, { siteUrl });
  const document = parseDocument(sanitized, { decodeEntities: true, lowerCaseAttributeNames: true, lowerCaseTags: true });
  const links = descendants(document, (element) => element.name === "a");
  if (links.some((link) => /\/mod\/questionnaire\/complete\.php$/i.test(new URL(link.attribs.href ?? siteUrl, siteUrl).pathname))) return "complete";
  if (links.some((link) => /\/mod\/questionnaire\/(?:myreport|report)\.php$/i.test(new URL(link.attribs.href ?? siteUrl, siteUrl).pathname))) return "report";
  return null;
}

function questionnaireMode(
  projection: MoodlePageProjection,
  report: readonly QuestionnaireReportItem[],
): "closed" | "report" | "respond" | "summary" {
  if (projection.screen.forms.some((form) => form.controls.length > 0)) return "respond";
  if (report.length > 0) return "report";
  return projection.screen.state === "closed" ? "closed" : "summary";
}

function attendanceSummary(html: string, siteUrl: string, screen: MoodleScreenModel): AttendanceScreenSummary {
  const sanitized = sanitizeMoodlePageHtml(html, { siteUrl });
  const document = parseDocument(sanitized, { decodeEntities: true, lowerCaseAttributeNames: true, lowerCaseTags: true });
  const pageText = text(document);
  const currentStatus = /(?:出席|present|attended)/i.test(pageText) ? "present"
    : /(?:遅刻|late)/i.test(pageText) ? "late"
      : /(?:欠席|absent)/i.test(pageText) ? "absent" : "unknown";
  const records = descendants(document, (element) => element.name === "tr").slice(0, 100).flatMap((row) => {
    const cells = row.children.filter((child): child is Element => isElement(child) && (child.name === "td" || child.name === "th"));
    if (cells.length < 2) return [];
    const date = text(cells[0] as Element);
    const status = text(cells.at(-1) as Element);
    return date === "" || status === "" ? [] : [{ date, status }];
  });
  const codeControlId = screen.forms.flatMap((form) => form.controls)
    .find((control) => /(?:出席|attendance).*(?:コード|code)|(?:コード|code).*(?:出席|attendance)/i.test(control.label))?.id ?? null;
  return { codeControlId, currentStatus, records };
}

export async function readHtmlActivityScreen(request: HtmlActivityRequest): Promise<HtmlActivityScreen> {
  const client = await createAuthenticatedMoodlePageClient();
  const moduleName = safeModuleName(request.moduleName);
  let response = await client.get({ path: `mod/${moduleName}/view.php`, search: { id: request.cmid } });

  if (moduleName === "questionnaire") {
    const destination = questionnaireDestination(response.html, request.siteUrl);
    if (destination === "complete") {
      response = await client.get({ path: "mod/questionnaire/complete.php", search: { id: request.cmid } });
    } else if (destination === "report" && request.instance !== null) {
      response = await client.get({
        path: "mod/questionnaire/myreport.php",
        search: { action: "vresp", byresponse: 1, group: 0, instance: request.instance, userid: request.userId },
      });
    }
    const projection = parseMoodlePage(response.html, { currentUrl: response.url, siteUrl: request.siteUrl });
    const report = parseQuestionnaireReport(response.html, request.siteUrl);
    return {
      kind: "questionnaire",
      mode: questionnaireMode(projection, report.items),
      projection,
      report: report.items,
      screen: projection.screen,
      submittedAt: report.submittedAt,
    };
  }

  const projection = parseMoodlePage(response.html, { currentUrl: response.url, siteUrl: request.siteUrl });
  if (moduleName === "autoattendmod") return { attendance: attendanceSummary(response.html, request.siteUrl, projection.screen), kind: "attendance", projection, screen: projection.screen };
  return { kind: "generic", moduleName, projection, screen: projection.screen };
}
