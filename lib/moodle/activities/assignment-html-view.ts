import {
  moodleDocumentText,
  type MoodleDocument,
  type MoodleHtmlNode,
} from "@/lib/moodle/html";
import type { MoodleScreenModel } from "@/lib/moodle/page-model";

export type AssignmentHtmlFact = Readonly<{
  label: string;
  value: string;
}>;

export type AssignmentHtmlView = Readonly<{
  description: MoodleDocument;
  schedule: readonly AssignmentHtmlFact[];
  status: readonly AssignmentHtmlFact[];
}>;

const SCHEDULE_LABELS = new Set(["開始", "期限", "締切", "終了", "利用可能開始", "利用可能終了"]);

function nodeText(node: MoodleHtmlNode): string {
  if (node.kind === "text") return node.value;
  if (node.kind === "break") return "\n";
  if (node.kind === "image") return node.alt;
  if (node.kind === "input") return node.value ?? "";
  if (node.kind === "textarea") return node.value;
  if (node.kind === "select") return node.options.filter((option) => option.selected).map((option) => option.label).join(" ");
  if (node.kind === "list") return node.items.map(nodeText).join(" ");
  return node.children.map(nodeText).join("");
}

function normalizedText(node: MoodleHtmlNode): string {
  return nodeText(node).replace(/\s+/g, " ").trim();
}

function normalizedLabel(value: string): string {
  return value.replace(/[：:]/g, "").replace(/\s+/g, "").trim();
}

function childNodes(node: MoodleHtmlNode): readonly MoodleHtmlNode[] {
  return node.kind === "list" ? node.items : "children" in node ? node.children : [];
}

function tableFacts(table: MoodleHtmlNode): readonly AssignmentHtmlFact[] {
  if (table.kind !== "table") return [];
  const facts: AssignmentHtmlFact[] = [];
  for (const section of table.children) {
    if (section.kind !== "tableHead" && section.kind !== "tableBody") continue;
    for (const row of section.children) {
      if (row.kind !== "tableRow") continue;
      const cells = row.children.filter((child) => child.kind === "tableCell");
      const label = cells[0] === undefined ? "" : normalizedText(cells[0]);
      const value = cells.slice(1).map(normalizedText).filter(Boolean).join(" ");
      if (label !== "") facts.push({ label, value });
    }
  }
  return facts;
}

function isStatusTable(node: MoodleHtmlNode): boolean {
  return tableFacts(node).some((fact) => /提出(?:ステータス|状況)|評定ステータス|残り時間/.test(fact.label));
}

function isStatusHeading(node: MoodleHtmlNode): boolean {
  return node.kind === "heading" && /提出(?:ステータス|状況)/.test(normalizedText(node));
}

function collectSchedule(nodes: readonly MoodleHtmlNode[], facts: AssignmentHtmlFact[]): void {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (node === undefined) continue;
    if (node.kind === "strong") {
      const label = normalizedLabel(normalizedText(node));
      if (SCHEDULE_LABELS.has(label)) {
        const next = nodes.slice(index + 1).find((candidate) => normalizedText(candidate) !== "");
        const value = next === undefined ? "" : normalizedText(next);
        if (value !== "" && !SCHEDULE_LABELS.has(normalizedLabel(value))) facts.push({ label, value });
      }
    }
    collectSchedule(childNodes(node), facts);
  }
}

function collectStatus(nodes: readonly MoodleHtmlNode[], facts: AssignmentHtmlFact[]): void {
  for (const node of nodes) {
    if (isStatusTable(node)) facts.push(...tableFacts(node));
    collectStatus(childNodes(node), facts);
  }
}

function uniqueFacts(facts: readonly AssignmentHtmlFact[]): readonly AssignmentHtmlFact[] {
  const keys = new Set<string>();
  return facts.filter((fact) => {
    const key = `${fact.label}\u0000${fact.value}`;
    if (keys.has(key)) return false;
    keys.add(key);
    return true;
  });
}

function stripAssignmentChrome(nodes: readonly MoodleHtmlNode[], screenTitle: string): readonly MoodleHtmlNode[] {
  const next: MoodleHtmlNode[] = [];
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (node === undefined) continue;
    const value = normalizedText(node);
    if ((node.kind === "heading" && value === screenTitle) || value === "完了要件" || isStatusHeading(node) || isStatusTable(node)) continue;
    if (node.kind === "strong" && SCHEDULE_LABELS.has(normalizedLabel(value))) {
      const following = nodes[index + 1];
      if (following !== undefined && following.kind === "text" && normalizedText(following) !== "") index += 1;
      continue;
    }
    const children = childNodes(node);
    if (children.length === 0) {
      next.push(node);
      continue;
    }
    const strippedChildren = stripAssignmentChrome(children, screenTitle);
    if (node.kind === "list") next.push({ ...node, items: strippedChildren });
    else if ("children" in node) next.push({ ...node, children: strippedChildren });
  }
  return next;
}

/** Projects Moodle's assignment page into the information a student acts on. */
export function projectAssignmentHtmlScreen(screen: MoodleScreenModel): AssignmentHtmlView {
  const schedule: AssignmentHtmlFact[] = [];
  const status: AssignmentHtmlFact[] = [];
  collectSchedule(screen.document.nodes, schedule);
  collectStatus(screen.document.nodes, status);
  return {
    description: { kind: "document", nodes: stripAssignmentChrome(screen.document.nodes, screen.title) },
    schedule: uniqueFacts(schedule),
    status: uniqueFacts(status),
  };
}

export function hasAssignmentHtmlDescription(view: AssignmentHtmlView): boolean {
  return moodleDocumentText(view.description) !== "";
}
