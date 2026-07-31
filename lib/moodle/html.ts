import { parseDocument } from "htmlparser2";

import {
  sanitizeMoodleHtml,
  sanitizeQuizQuestionHtml,
} from "@/lib/security/html";

export type MoodleDocument = Readonly<{
  kind: "document";
  nodes: readonly MoodleHtmlNode[];
}>;

export type MoodleHtmlNode =
  | Readonly<{ kind: "text"; value: string }>
  | Readonly<{ kind: "break" }>
  | Readonly<{ kind: "paragraph" | "heading" | "blockquote" | "pre" | "div" | "span" | "strong" | "em" | "strike" | "code" | "label"; children: readonly MoodleHtmlNode[]; level?: 2 | 3 | 4 | undefined; className?: string | undefined; htmlFor?: string | undefined }>
  | Readonly<{ kind: "link"; children: readonly MoodleHtmlNode[]; href: string; title?: string | undefined; external: boolean }>
  | Readonly<{ kind: "image"; src: string; alt: string; title?: string | undefined; width?: number | undefined; height?: number | undefined }>
  | Readonly<{ kind: "list"; ordered: boolean; items: readonly MoodleHtmlNode[] }>
  | Readonly<{ kind: "listItem"; children: readonly MoodleHtmlNode[] }>
  | Readonly<{ kind: "table"; children: readonly MoodleHtmlNode[] }>
  | Readonly<{ kind: "tableHead" | "tableBody" | "tableRow"; children: readonly MoodleHtmlNode[] }>
  | Readonly<{ kind: "tableCell"; heading: boolean; children: readonly MoodleHtmlNode[]; colSpan?: number | undefined; rowSpan?: number | undefined; scope?: "col" | "row" | "colgroup" | "rowgroup" | undefined }>
  | Readonly<{ kind: "input"; inputType: "checkbox" | "hidden" | "number" | "radio" | "text"; name?: string | undefined; value?: string | undefined; id?: string | undefined; checked: boolean; disabled: boolean; min?: string | undefined; max?: string | undefined; maxLength?: number | undefined; step?: string | undefined; className?: string | undefined }>
  | Readonly<{ kind: "select"; name?: string | undefined; id?: string | undefined; disabled: boolean; multiple: boolean; options: readonly Readonly<{ disabled: boolean; selected: boolean; value: string; label: string }>[] }>
  | Readonly<{ kind: "textarea"; name?: string | undefined; id?: string | undefined; disabled: boolean; rows?: number | undefined; cols?: number | undefined; maxLength?: number | undefined; value: string }>
  | Readonly<{ kind: "button"; action?: "clear" | undefined; children: readonly MoodleHtmlNode[]; className?: string | undefined }>;

type ParsedNode = Readonly<{
  type?: string;
  name?: string;
  data?: string;
  attribs?: Record<string, string>;
  children?: readonly ParsedNode[];
}>;

type MoodleTableRow = Readonly<{ kind: "tableRow"; children: readonly MoodleHtmlNode[] }>;
type MoodleTableSection = Readonly<{ kind: "tableHead" | "tableBody"; children: readonly MoodleHtmlNode[] }>;

const QUIZ_CLASSES = new Set([
  "quiz-source-hidden",
  "quiz-response-prompt",
  "quiz-response-answer",
  "quiz-response-input",
]);

function safeClassName(value: string | undefined): string | undefined {
  const classes = value?.split(/\s+/).filter((className) => QUIZ_CLASSES.has(className)) ?? [];
  return classes.length === 0 ? undefined : classes.join(" ");
}

function text(node: ParsedNode): string {
  return node.data ?? "";
}

function numericAttribute(value: string | undefined, maximum: number): number | undefined {
  if (value === undefined || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= maximum ? parsed : undefined;
}

function parseChildren(nodes: readonly ParsedNode[] | undefined): readonly MoodleHtmlNode[] {
  return (nodes ?? []).flatMap(parseNode);
}

/**
 * Browsers repair invalid table trees by moving text nodes and inserting a
 * tbody.  Moodle's HTML often includes a visually-hidden caption and
 * whitespace around rows, both of which otherwise become direct children of
 * a table in the generic document model.  Keep the serialized model valid so
 * the server and browser produce the same DOM during hydration.
 */
function isTableRow(node: MoodleHtmlNode): node is MoodleTableRow {
  return node.kind === "tableRow";
}

function normalizeTableRow(node: MoodleTableRow): MoodleTableRow {
  return {
    ...node,
    children: node.children.filter((child) => child.kind === "tableCell"),
  };
}

function isTableSection(node: MoodleHtmlNode): node is MoodleTableSection {
  return node.kind === "tableHead" || node.kind === "tableBody";
}

function normalizeTableSection(node: MoodleTableSection): MoodleTableSection {
  return {
    ...node,
    children: node.children
      .filter(isTableRow)
      .map(normalizeTableRow),
  };
}

function normalizeTableChildren(children: readonly MoodleHtmlNode[]): readonly MoodleHtmlNode[] {
  const sections: MoodleHtmlNode[] = [];
  let looseRows: MoodleTableRow[] = [];

  function appendLooseRows(): void {
    if (looseRows.length === 0) return;
    sections.push({
      kind: "tableBody",
      children: looseRows.map(normalizeTableRow),
    });
    looseRows = [];
  }

  for (const child of children) {
    if (isTableSection(child)) {
      appendLooseRows();
      sections.push(normalizeTableSection(child));
    } else if (isTableRow(child)) {
      looseRows.push(child);
    }
  }
  appendLooseRows();
  return sections;
}

function optionFrom(node: ParsedNode): Readonly<{ disabled: boolean; selected: boolean; value: string; label: string }> {
  const attributes = node.attribs ?? {};
  return {
    disabled: "disabled" in attributes,
    label: collectText(node.children).trim(),
    selected: "selected" in attributes,
    value: attributes.value ?? collectText(node.children).trim(),
  };
}

function collectText(nodes: readonly ParsedNode[] | undefined): string {
  return (nodes ?? []).map((node) => node.type === "text" ? text(node) : collectText(node.children)).join("");
}

function parseNode(node: ParsedNode): readonly MoodleHtmlNode[] {
  if (node.type === "text") return text(node) === "" ? [] : [{ kind: "text", value: text(node) }];
  if (node.type !== "tag") return parseChildren(node.children);
  const attributes = node.attribs ?? {};
  const children = parseChildren(node.children);
  const className = safeClassName(attributes.class);
  switch (node.name) {
    case "br": return [{ kind: "break" }];
    case "p": return [{ kind: "paragraph", children }];
    case "h2": return [{ kind: "heading", level: 2, children }];
    case "h3": return [{ kind: "heading", level: 3, children }];
    case "h4": return [{ kind: "heading", level: 4, children }];
    case "blockquote": return [{ kind: "blockquote", children }];
    case "pre": return [{ kind: "pre", children }];
    case "div": return [{ kind: "div", children, ...(className === undefined ? {} : { className }) }];
    case "span": return [{ kind: "span", children, ...(className === undefined ? {} : { className }) }];
    case "strong": return [{ kind: "strong", children }];
    case "em": return [{ kind: "em", children }];
    case "s": return [{ kind: "strike", children }];
    case "code": return [{ kind: "code", children }];
    case "label": return [{ kind: "label", children, ...(attributes.for === undefined ? {} : { htmlFor: attributes.for }), ...(className === undefined ? {} : { className }) }];
    case "a": {
      const href = attributes.href;
      return href === undefined ? children : [{ kind: "link", children, href, external: !href.startsWith("/"), ...(attributes.title === undefined ? {} : { title: attributes.title }) }];
    }
    case "img": {
      const src = attributes.src;
      return src === undefined ? [] : [{ kind: "image", src, alt: attributes.alt ?? "", ...(attributes.title === undefined ? {} : { title: attributes.title }), ...(numericAttribute(attributes.width, 4_000) === undefined ? {} : { width: numericAttribute(attributes.width, 4_000) }), ...(numericAttribute(attributes.height, 4_000) === undefined ? {} : { height: numericAttribute(attributes.height, 4_000) }) }];
    }
    case "ul": return [{ kind: "list", ordered: false, items: children }];
    case "ol": return [{ kind: "list", ordered: true, items: children }];
    case "li": return [{ kind: "listItem", children }];
    case "table": return [{ kind: "table", children: normalizeTableChildren(children) }];
    case "thead": return [normalizeTableSection({ kind: "tableHead", children })];
    case "tbody": return [normalizeTableSection({ kind: "tableBody", children })];
    case "tr": return [normalizeTableRow({ kind: "tableRow", children })];
    case "th": return [{ kind: "tableCell", heading: true, children, ...(numericAttribute(attributes.colspan, 100) === undefined ? {} : { colSpan: numericAttribute(attributes.colspan, 100) }), ...(numericAttribute(attributes.rowspan, 100) === undefined ? {} : { rowSpan: numericAttribute(attributes.rowspan, 100) }), ...(attributes.scope === "col" || attributes.scope === "row" || attributes.scope === "colgroup" || attributes.scope === "rowgroup" ? { scope: attributes.scope } : {}) }];
    case "td": return [{ kind: "tableCell", heading: false, children, ...(numericAttribute(attributes.colspan, 100) === undefined ? {} : { colSpan: numericAttribute(attributes.colspan, 100) }), ...(numericAttribute(attributes.rowspan, 100) === undefined ? {} : { rowSpan: numericAttribute(attributes.rowspan, 100) }) }];
    case "input": {
      const inputType = attributes.type === "checkbox" || attributes.type === "hidden" || attributes.type === "number" || attributes.type === "radio" ? attributes.type : "text";
      return [{ kind: "input", inputType, checked: "checked" in attributes, disabled: "disabled" in attributes, ...(attributes.name === undefined ? {} : { name: attributes.name }), ...(attributes.value === undefined ? {} : { value: attributes.value }), ...(attributes.id === undefined ? {} : { id: attributes.id }), ...(attributes.min === undefined ? {} : { min: attributes.min }), ...(attributes.max === undefined ? {} : { max: attributes.max }), ...(numericAttribute(attributes.maxlength, 100_000) === undefined ? {} : { maxLength: numericAttribute(attributes.maxlength, 100_000) }), ...(attributes.step === undefined ? {} : { step: attributes.step }), ...(className === undefined ? {} : { className }) }];
    }
    case "select": return [{ kind: "select", disabled: "disabled" in attributes, multiple: "multiple" in attributes, options: (node.children ?? []).filter((child) => child.type === "tag" && child.name === "option").map(optionFrom), ...(attributes.name === undefined ? {} : { name: attributes.name }), ...(attributes.id === undefined ? {} : { id: attributes.id }) }];
    case "textarea": return [{ kind: "textarea", disabled: "disabled" in attributes, value: collectText(node.children), ...(attributes.name === undefined ? {} : { name: attributes.name }), ...(attributes.id === undefined ? {} : { id: attributes.id }), ...(numericAttribute(attributes.rows, 100) === undefined ? {} : { rows: numericAttribute(attributes.rows, 100) }), ...(numericAttribute(attributes.cols, 1_000) === undefined ? {} : { cols: numericAttribute(attributes.cols, 1_000) }), ...(numericAttribute(attributes.maxlength, 100_000) === undefined ? {} : { maxLength: numericAttribute(attributes.maxlength, 100_000) }) }];
    case "button": return [{ kind: "button", children, ...(attributes["data-quiz-action"] === "clear" ? { action: "clear" as const } : {}), ...(className === undefined ? {} : { className }) }];
    default: return children;
  }
}

export function documentFromSanitizedHtml(value: string): MoodleDocument {
  const parsed = parseDocument(value, { decodeEntities: true, lowerCaseTags: true, lowerCaseAttributeNames: true }) as unknown as Readonly<{ children: readonly ParsedNode[] }>;
  return { kind: "document", nodes: parseChildren(parsed.children) };
}

export function moodleDocumentFromHtml(value: string, options: Readonly<{ siteUrl: string }>): MoodleDocument {
  return documentFromSanitizedHtml(sanitizeMoodleHtml(value, options));
}

export function moodleQuizDocumentFromHtml(value: string, options: Readonly<{ siteUrl: string }>): MoodleDocument {
  return documentFromSanitizedHtml(sanitizeQuizQuestionHtml(value, options));
}

export function isEmptyMoodleDocument(value: MoodleDocument): boolean {
  return value.nodes.every((node) => node.kind === "text" && node.value.trim() === "");
}

export function moodleDocumentText(value: MoodleDocument): string {
  function textFromNode(node: MoodleHtmlNode): string {
    if (node.kind === "text") return node.value;
    if (node.kind === "break") return "\n";
    if (node.kind === "image") return node.alt;
    if (node.kind === "select") return node.options.filter((option) => option.selected).map((option) => option.label).join(" ");
    if (node.kind === "input" || node.kind === "textarea") return node.kind === "textarea" ? node.value : node.value ?? "";
    if (node.kind === "list") return node.items.map(textFromNode).join("\n");
    if (node.kind === "button") return node.children.map(textFromNode).join("");
    if ("children" in node) return node.children.map(textFromNode).join("");
    return "";
  }
  return value.nodes.map(textFromNode).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function moodleDocumentControlNames(value: MoodleDocument): readonly string[] {
  const names = new Set<string>();
  function inspect(node: MoodleHtmlNode): void {
    if ((node.kind === "input" || node.kind === "select" || node.kind === "textarea") && node.name !== undefined) names.add(node.name);
    if (node.kind === "list") node.items.forEach(inspect);
    else if (node.kind === "button" || "children" in node) node.children.forEach(inspect);
  }
  value.nodes.forEach(inspect);
  return [...names];
}
