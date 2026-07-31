import type { AnyNode, Element } from "domhandler";
import { DomUtils, parseDocument } from "htmlparser2";

import { sanitizeMoodlePageHtml } from "@/lib/security/html";

import type { QuestionnaireReportItem } from "./html-screen-model";

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

function first(node: AnyNode, predicate: (element: Element) => boolean): Element | null {
  if (isElement(node) && predicate(node)) return node;
  if (!("children" in node)) return null;
  for (const child of node.children) {
    const match = first(child, predicate);
    if (match !== null) return match;
  }
  return null;
}

function text(node: AnyNode): string {
  return DomUtils.textContent(node).replaceAll("\u00a0", " ").replace(/\s+/g, " ").trim();
}

function labelMap(root: AnyNode): ReadonlyMap<string, string> {
  const labels = new Map<string, string>();
  for (const label of descendants(root, (element) => element.name === "label")) {
    if (label.attribs.for !== undefined) labels.set(label.attribs.for, text(label));
  }
  return labels;
}

function wrappingLabel(element: Element): string | null {
  let parent = element.parent;
  while (parent !== null && parent !== undefined) {
    if (isElement(parent) && parent.name === "label") return text(parent);
    if (isElement(parent) && parent.name === "fieldset") return null;
    parent = parent.parent;
  }
  return null;
}

/** Parses a sanitized Moodle Questionnaire report into a respondent-free model. */
export function parseQuestionnaireReport(html: string, siteUrl: string): Readonly<{ items: readonly QuestionnaireReportItem[]; submittedAt: string | null }> {
  const sanitized = sanitizeMoodlePageHtml(html, { siteUrl });
  const document = parseDocument(sanitized, { decodeEntities: true, lowerCaseAttributeNames: true, lowerCaseTags: true });
  const main = first(document, (element) => element.name === "main") ?? document;
  const labels = labelMap(main);
  const items = descendants(main, (element) => element.name === "fieldset").slice(0, 500).flatMap((fieldset, index) => {
    const paragraph = first(fieldset, (element) => element.name === "p");
    const legend = first(fieldset, (element) => element.name === "legend");
    const heading = first(fieldset, (element) => /^h[1-6]$/.test(element.name));
    const prompt = paragraph === null ? (legend === null ? "" : text(legend)) : text(paragraph);
    if (prompt === "") return [];
    const answers: string[] = [];
    for (const control of descendants(fieldset, (element) => ["input", "option", "select", "textarea"].includes(element.name))) {
      if (control.name === "input") {
        const type = control.attribs.type ?? "text";
        if ((type === "radio" || type === "checkbox") && !("checked" in control.attribs)) continue;
        const value = control.attribs.id === undefined ? undefined : labels.get(control.attribs.id);
        const answer = value ?? wrappingLabel(control) ?? control.attribs.value ?? "";
        if (answer !== "" && type !== "hidden") answers.push(answer);
      } else if (control.name === "option" && "selected" in control.attribs) {
        const answer = text(control);
        if (answer !== "") answers.push(answer);
      } else if (control.name === "textarea") {
        const answer = DomUtils.textContent(control).trim();
        if (answer !== "") answers.push(answer);
      }
    }
    return [{ answers: [...new Set(answers)], number: heading === null ? String(index + 1) : text(heading), prompt }];
  });
  const submittedLine = descendants(main, (element) => ["div", "li", "p", "span", "strong"].includes(element.name))
    .map((element) => text(element))
    .find((value) => /^(?:提出完了|submitted)\s*[:：]/i.test(value));
  const submittedAt = submittedLine === undefined
    ? null
    : /^(?:提出完了|submitted)\s*[:：]\s*(.+)$/i.exec(submittedLine)?.[1]?.trim() ?? null;
  return { items, submittedAt };
}
