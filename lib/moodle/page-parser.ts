import { createHash } from "node:crypto";

import type { AnyNode, Element } from "domhandler";
import { DomUtils, parseDocument } from "htmlparser2";

import { sanitizeMoodlePageHtml } from "@/lib/security/html";

import { moodleDocumentFromHtml } from "./html";
import type {
  GenericMoodleFormSubmission,
  MoodleFormAction,
  MoodleFormControl,
  MoodleFormModel,
  MoodleScreenModel,
} from "./page-model";

type SnapshotField = Readonly<{
  controlId: string;
  kind: MoodleFormControl["kind"];
  name: string;
  options: ReadonlyMap<string, Readonly<{ name: string; value: string }>>;
}>;

type SnapshotAction = Readonly<{
  id: string;
  name?: string;
  value?: string;
}>;

export type MoodleFormSnapshot = Readonly<{
  action: URL;
  actions: readonly SnapshotAction[];
  fields: readonly SnapshotField[];
  hidden: readonly Readonly<{ name: string; value: string }>[];
  id: string;
  method: "get" | "post";
  revision: string;
}>;

export type MoodlePageProjection = Readonly<{
  forms: readonly MoodleFormSnapshot[];
  screen: MoodleScreenModel;
}>;

export type MaterializedMoodleForm =
  | Readonly<{ kind: "ready"; action: URL; body: URLSearchParams; method: "get" | "post" }>
  | Readonly<{ kind: "invalid"; fieldErrors: Readonly<Record<string, string>>; message: string }>
  | Readonly<{ kind: "changed" }>;

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

function firstElement(node: AnyNode, predicate: (element: Element) => boolean): Element | null {
  if (isElement(node) && predicate(node)) return node;
  if (!("children" in node)) return null;
  for (const child of node.children) {
    const match = firstElement(child, predicate);
    if (match !== null) return match;
  }
  return null;
}

/**
 * Moodle's Boost-derived themes commonly expose the content landmark as
 * `#region-main` rather than a semantic `<main>` element.  Parsing the whole
 * document in that case leaks the shell, message drawer, and account menu
 * into the student-facing screen model.
 */
function pageContentRoot(document: AnyNode): AnyNode {
  return firstElement(document, (element) => element.attribs.id === "region-main")
    ?? firstElement(document, (element) => (element.attribs.class ?? "").split(/\s+/).includes("region-main"))
    ?? firstElement(document, (element) => element.attribs.role === "main")
    ?? firstElement(document, (element) => element.name === "main")
    ?? document;
}

function normalizedText(node: AnyNode): string {
  return DomUtils.textContent(node).replaceAll("\u00a0", " ").replace(/\s+/g, " ").trim();
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function shortId(value: string): string {
  return digest(value).slice(0, 24);
}

function numeric(value: string | undefined, max: number): number | undefined {
  if (value === undefined || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= max ? parsed : undefined;
}

function directLabelMap(form: Element): ReadonlyMap<string, string> {
  const labels = new Map<string, string>();
  for (const label of descendants(form, (element) => element.name === "label")) {
    const target = label.attribs.for;
    if (target !== undefined) labels.set(target, normalizedText(label));
  }
  return labels;
}

function wrappingLabel(element: Element): string | null {
  let parent = element.parent;
  while (parent !== null && parent !== undefined && parent !== element.parent?.parent?.parent) {
    if (isElement(parent) && parent.name === "label") return normalizedText(parent);
    parent = parent.parent;
  }
  return null;
}

function fieldsetLegend(element: Element): string | null {
  let parent = element.parent;
  while (parent !== null && parent !== undefined) {
    if (isElement(parent) && parent.name === "fieldset") {
      const legend = firstElement(parent, (candidate) => candidate.name === "legend");
      return legend === null ? null : normalizedText(legend);
    }
    if (isElement(parent) && parent.name === "form") return null;
    parent = parent.parent;
  }
  return null;
}

function requiredByQuestionContainer(element: Element): boolean {
  let parent = element.parent;
  while (parent !== null && parent !== undefined) {
    if (isElement(parent) && parent.name === "fieldset") {
      return descendants(parent, (candidate) => (candidate.attribs.class ?? "").split(/\s+/).includes("accesshide"))
        .some((candidate) => /^(?:required|必須)$/i.test(normalizedText(candidate)));
    }
    if (isElement(parent) && parent.name === "form") return false;
    parent = parent.parent;
  }
  return false;
}

function controlLabel(element: Element, labels: ReadonlyMap<string, string>, fallback: string): string {
  const id = element.attribs.id;
  return element.attribs["aria-label"]
    ?? (id === undefined ? undefined : labels.get(id))
    ?? wrappingLabel(element)
    ?? fieldsetLegend(element)
    ?? element.attribs.placeholder
    ?? fallback;
}

function optionLabel(element: Element, labels: ReadonlyMap<string, string>, fallback: string): string {
  const id = element.attribs.id;
  return (id === undefined ? undefined : labels.get(id)) ?? wrappingLabel(element) ?? fallback;
}

function groupedByName(elements: readonly Element[]): ReadonlyMap<string, Element[]> {
  const groups = new Map<string, Element[]>();
  for (const element of elements) {
    const name = element.attribs.name;
    if (name === undefined || name === "") continue;
    const checkboxBase = (element.name === "input" && (element.attribs.type ?? "text").toLowerCase() === "checkbox")
      ? /^(.*)\[[^\]]+\]$/.exec(name)?.[1]
      : undefined;
    const key = checkboxBase === undefined ? name : `checkbox-group:${checkboxBase}`;
    const existing = groups.get(key) ?? [];
    existing.push(element);
    groups.set(key, existing);
  }
  return groups;
}

function optionId(formId: string, name: string, value: string): string {
  return shortId(`option:${formId}:${name}:${value}`);
}

function elementById(root: Element, id: string): Element | null {
  return firstElement(root, (candidate) => candidate.attribs.id === id);
}

function controlError(form: Element, elements: readonly Element[]): string | null {
  for (const element of elements) {
    for (const id of (element.attribs["aria-describedby"] ?? "").split(/\s+/).filter(Boolean)) {
      const description = elementById(form, id);
      if (description !== null && /error|invalid|feedback|alert/i.test(`${description.attribs.class ?? ""} ${description.attribs.role ?? ""}`)) {
        const message = normalizedText(description);
        if (message !== "") return message;
      }
    }
  }
  let parent = elements[0]?.parent;
  while (parent !== null && parent !== undefined) {
    if (isElement(parent)) {
      const error = descendants(parent, (candidate) => /(?:^|\s)(?:error|invalid-feedback|notifyproblem)(?:\s|$)/i.test(candidate.attribs.class ?? ""))[0];
      if (error !== undefined) {
        const message = normalizedText(error);
        if (message !== "") return message;
      }
      if (parent.name === "fieldset" || parent.name === "form") break;
    }
    parent = parent.parent;
  }
  return null;
}

function actionPurpose(element: Element, label: string, method: "get" | "post"): MoodleFormAction["purpose"] {
  const identity = `${element.attribs.name ?? ""} ${element.attribs.class ?? ""} ${label}`.toLowerCase();
  if (/\bdelete\b|\bremove\b|削除/.test(identity)) return "delete";
  if (/\bcancel\b|キャンセル|\bprev(?:ious)?\b|前へ|前のページ/.test(identity)) return "previous";
  if (/\bnext\b|次へ|次のページ/.test(identity)) return "next";
  if (method === "get") return /\bsearch\b|検索/.test(identity) ? "search" : "next";
  if (/\bresume\b|\bsave\b|保存|下書き/.test(identity)) return "save";
  if (/\bsubmit\b|提出|送信|回答を完了/.test(identity)) return "submit";
  if (/\bsearch\b|検索/.test(identity)) return "search";
  return "other";
}

function parseForm(form: Element, index: number, currentUrl: URL): Readonly<{ model: MoodleFormModel; snapshot: MoodleFormSnapshot }> | null {
  if (form.attribs["data-action-invalid"] === "true") return null;
  const method = form.attribs.method?.toLowerCase() === "post" ? "post" : "get";
  const action = new URL(form.attribs.action ?? currentUrl.toString(), currentUrl);
  if (action.origin !== currentUrl.origin) return null;
  const labels = directLabelMap(form);
  const formId = shortId(`form:${index}:${action.pathname}:${form.attribs.id ?? ""}`);
  const allControls = descendants(form, (element) => ["button", "input", "select", "textarea"].includes(element.name));
  const grouped = groupedByName(allControls.filter((element) => !["button", "submit", "reset"].includes(element.attribs.type ?? element.name)));
  const hidden: Array<Readonly<{ name: string; value: string }>> = [];
  const fields: SnapshotField[] = [];
  const controls: MoodleFormControl[] = [];
  const sourceElements = new Map<string, readonly Element[]>();

  for (const [groupName, elements] of grouped) {
    const first = elements[0];
    if (first === undefined) continue;
    const rawName = first.attribs.name;
    if (rawName === undefined) continue;
    const name = groupName.startsWith("checkbox-group:") ? groupName.slice("checkbox-group:".length) : rawName;
    const inputType = first.name === "input" ? (first.attribs.type ?? "text").toLowerCase() : first.name;
    if (inputType === "hidden") {
      for (const element of elements) hidden.push({ name, value: element.attribs.value ?? "" });
      continue;
    }
    if (inputType === "file" || inputType === "password") continue;
    const controlId = shortId(`control:${formId}:${name}`);
    sourceElements.set(controlId, elements);
    const disabled = elements.every((element) => "disabled" in element.attribs);
    const required = elements.some((element) => "required" in element.attribs || requiredByQuestionContainer(element));
    const label = controlLabel(first, labels, name.replace(/[_-]+/g, " "));

    if (inputType === "radio" || inputType === "checkbox") {
      const optionMap = new Map<string, Readonly<{ name: string; value: string }>>();
      const options = elements.map((element) => {
        const rawValue = element.attribs.value ?? "1";
        const rawOptionName = element.attribs.name ?? rawName;
        const id = optionId(formId, rawOptionName, rawValue);
        optionMap.set(id, { name: rawOptionName, value: rawValue });
        return { disabled: "disabled" in element.attribs, id, label: optionLabel(element, labels, rawValue) };
      });
      if (inputType === "checkbox" && elements.length === 1 && name === rawName) {
        controls.push({ checked: "checked" in first.attribs, disabled, id: controlId, kind: "checkbox", label, required });
        fields.push({ controlId, kind: "checkbox", name, options: optionMap });
      } else {
        const selected = elements.flatMap((element) => "checked" in element.attribs
          ? [optionId(formId, element.attribs.name ?? rawName, element.attribs.value ?? "1")]
          : []);
        const kind = inputType === "radio" ? "radio" as const : "checkboxes" as const;
        controls.push({ disabled, id: controlId, kind, label: fieldsetLegend(first) ?? label, multiple: kind === "checkboxes", options, required, selected });
        fields.push({ controlId, kind, name, options: optionMap });
      }
      continue;
    }

    if (first.name === "select") {
      const optionElements = descendants(first, (element) => element.name === "option");
      const optionMap = new Map<string, Readonly<{ name: string; value: string }>>();
      const options = optionElements.map((element) => {
        const rawValue = element.attribs.value ?? normalizedText(element);
        const id = optionId(formId, name, rawValue);
        optionMap.set(id, { name: rawName, value: rawValue });
        return { disabled: "disabled" in element.attribs, id, label: normalizedText(element) };
      });
      const selected = optionElements.flatMap((element) => "selected" in element.attribs
        ? [optionId(formId, name, element.attribs.value ?? normalizedText(element))]
        : []);
      controls.push({ disabled, id: controlId, kind: "select", label, multiple: "multiple" in first.attribs, options, required, selected });
      fields.push({ controlId, kind: "select", name, options: optionMap });
      continue;
    }

    if (first.name === "textarea") {
      const maxLength = numeric(first.attribs.maxlength, 100_000);
      const rows = numeric(first.attribs.rows, 100);
      controls.push({
        disabled,
        id: controlId,
        kind: "textarea",
        label,
        ...(maxLength === undefined ? {} : { maxLength }),
        required,
        ...(rows === undefined ? {} : { rows }),
        value: DomUtils.textContent(first),
      });
      fields.push({ controlId, kind: "textarea", name, options: new Map() });
      continue;
    }

    const kind = inputType === "email" || inputType === "number" || inputType === "date" || inputType === "range"
      ? inputType
      : inputType === "datetime-local" ? "datetime" as const
        : first.attribs.id?.toLowerCase().startsWith("numerical") ? "number" as const : "text" as const;
    const maxLength = numeric(first.attribs.maxlength, 100_000);
    controls.push({
      disabled,
      id: controlId,
      kind,
      label,
      ...(first.attribs.max === undefined ? {} : { max: first.attribs.max }),
      ...(maxLength === undefined ? {} : { maxLength }),
      ...(first.attribs.min === undefined ? {} : { min: first.attribs.min }),
      ...(first.attribs.placeholder === undefined ? {} : { placeholder: first.attribs.placeholder }),
      required,
      ...(first.attribs.step === undefined ? {} : { step: first.attribs.step }),
      value: first.attribs.value ?? "",
    });
    fields.push({ controlId, kind, name, options: new Map() });
  }

  // Moodle's rich-text editor adds many `type="button"` toolbar controls.
  // They are client-side editor chrome, not server-side form actions.
  const submitElements = allControls.filter((element) =>
    element.attribs.type?.toLowerCase() === "submit"
      || (element.name === "button" && (element.attribs.type === undefined || element.attribs.type.toLowerCase() === "submit")),
  );
  const actions: MoodleFormAction[] = [];
  const snapshotActions: SnapshotAction[] = [];
  for (const [actionIndex, element] of submitElements.entries()) {
    if ("disabled" in element.attribs || element.attribs.type === "reset") continue;
    const label = normalizedText(element) || element.attribs.value || "送信";
    const id = shortId(`action:${formId}:${actionIndex}:${element.attribs.name ?? ""}:${element.attribs.value ?? ""}`);
    actions.push({ id, intent: actionIndex === submitElements.length - 1 ? "primary" : "secondary", label, purpose: actionPurpose(element, label, method) });
    snapshotActions.push({ id, ...(element.attribs.name === undefined ? {} : { name: element.attribs.name }), ...(element.attribs.value === undefined ? {} : { value: element.attribs.value }) });
  }
  const preferredPrimary = actions.findLastIndex((action) => action.purpose === "submit" || action.purpose === "next" || action.purpose === "save" || action.purpose === "search");
  if (preferredPrimary !== -1) {
    const normalizedActions = actions.map((action, index) => ({ ...action, intent: index === preferredPrimary ? "primary" as const : "secondary" as const }));
    actions.splice(0, actions.length, ...normalizedActions);
  }
  if (actions.length === 0 && controls.length > 0) {
    const id = shortId(`action:${formId}:default`);
    actions.push({ id, intent: "primary", label: method === "get" ? "検索" : "送信", purpose: method === "get" ? "search" : "submit" });
    snapshotActions.push({ id });
  }
  if (controls.length === 0 && actions.length === 0) return null;

  const errors = Object.fromEntries(controls.flatMap((control) => {
    const message = controlError(form, sourceElements.get(control.id) ?? []);
    return message === null ? [] : [[control.id, message]];
  }));

  const revision = digest(JSON.stringify({
    action: `${action.pathname}?${action.searchParams.toString()}`,
    actions: snapshotActions,
    fields: fields.map((field) => ({ kind: field.kind, name: field.name, options: [...field.options.values()] })),
    method,
  }));
  const title = fieldsetLegend(firstElement(form, () => true) ?? form) ?? form.attribs["aria-label"] ?? "入力フォーム";
  const model: MoodleFormModel = { actions, controls, errors, id: formId, method, revision, title };
  return { model, snapshot: { action, actions: snapshotActions, fields, hidden, id: formId, method, revision } };
}

function toneFor(element: Element): "info" | "success" | "warning" | "error" {
  const classes = element.attribs.class?.toLowerCase() ?? "";
  if (/danger|error|invalid/.test(classes)) return "error";
  if (/warning/.test(classes)) return "warning";
  if (/success/.test(classes)) return "success";
  return "info";
}

function pageState(text: string): MoodleScreenModel["state"] {
  if (/permission|権限|アクセスできません|not permitted/i.test(text)) return "forbidden";
  if (/終了しました|受付.*終了|回答期間.*終了|is closed|no longer available/i.test(text)) return "closed";
  return "ready";
}

function isMoodleClientChrome(element: Element): boolean {
  const classes = new Set((element.attribs.class ?? "").split(/\s+/).filter(Boolean));
  return element.attribs.id === "cmt-tmpl"
    || [...classes].some((className) => ["comment-area", "comment-ctrl", "comment-link", "commentscontainer", "showcommentsnonjs"].includes(className));
}

export function parseMoodlePage(
  html: string,
  options: Readonly<{ currentUrl: URL; siteUrl: string }>,
): MoodlePageProjection {
  const sanitized = sanitizeMoodlePageHtml(html, { siteUrl: options.siteUrl });
  const document = parseDocument(sanitized, { decodeEntities: true, lowerCaseAttributeNames: true, lowerCaseTags: true });
  const main = pageContentRoot(document);
  const heading = firstElement(main, (element) => element.name === "h1")
    ?? firstElement(document, (element) => element.name === "h1")
    ?? firstElement(document, (element) => element.name === "title");
  const title = heading === null ? "Moodle" : normalizedText(heading);
  const parsedForms = descendants(main, (element) => element.name === "form")
    .slice(0, 20)
    .map((form, index) => parseForm(form, index, options.currentUrl))
    .filter((value): value is NonNullable<typeof value> => value !== null);

  const contentClone = parseDocument(DomUtils.getInnerHTML(main), { decodeEntities: true, lowerCaseAttributeNames: true, lowerCaseTags: true });
  for (const element of descendants(contentClone, (candidate) => ["form", "footer", "header", "nav"].includes(candidate.name) || isMoodleClientChrome(candidate))) {
    DomUtils.removeElement(element);
  }
  const contentHtml = DomUtils.getInnerHTML(contentClone);
  const richDocument = moodleDocumentFromHtml(contentHtml, { siteUrl: options.siteUrl });
  const noticeElements = descendants(main, (element) => /(?:^|\s)(?:alert|notification|error|notifyproblem)(?:\s|$)/i.test(element.attribs.class ?? ""));
  const notices = noticeElements.slice(0, 20).flatMap((element) => {
    const message = normalizedText(element);
    return message === "" ? [] : [{ message, tone: toneFor(element) }];
  });
  const text = normalizedText(main);
  const screenRevision = digest(JSON.stringify({
    forms: parsedForms.map(({ model }) => model.revision),
    state: pageState(text),
    title,
  }));
  return {
    forms: parsedForms.map(({ snapshot }) => snapshot),
    screen: {
      document: richDocument,
      forms: parsedForms.map(({ model }) => model),
      notices,
      revision: screenRevision,
      state: pageState(text),
      title,
    },
  };
}

export function materializeMoodleFormSubmission(
  projection: MoodlePageProjection,
  submission: GenericMoodleFormSubmission,
): MaterializedMoodleForm {
  const form = projection.forms.find((candidate) => candidate.id === submission.formId);
  if (form === undefined || form.revision !== submission.revision) return { kind: "changed" };
  const action = form.actions.find((candidate) => candidate.id === submission.actionId);
  if (action === undefined) return { kind: "changed" };
  const knownControls = new Set(form.fields.map((field) => field.controlId));
  if (Object.keys(submission.values).some((key) => !knownControls.has(key))) return { kind: "changed" };

  const body = new URLSearchParams();
  form.hidden.forEach((field) => body.append(field.name, field.value));
  const fieldErrors: Record<string, string> = {};
  const publicForm = projection.screen.forms.find((candidate) => candidate.id === form.id);
  for (const field of form.fields) {
    const control = publicForm?.controls.find((candidate) => candidate.id === field.controlId);
    if (control?.disabled === true) continue;
    const value = submission.values[field.controlId];
    if (control?.required === true && (value === undefined || value === "" || value === false || (Array.isArray(value) && value.length === 0))) {
      fieldErrors[field.controlId] = "この項目は必須です。";
      continue;
    }
    if (value === undefined) continue;
    if (field.kind === "checkbox") {
      const option = [...field.options.values()][0];
      if (value === true) body.append(option?.name ?? field.name, option?.value ?? "1");
      continue;
    }
    if (field.kind === "radio" || field.kind === "checkboxes" || field.kind === "select") {
      const ids = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
      for (const id of ids) {
        const option = field.options.get(id);
        if (option === undefined) {
          fieldErrors[field.controlId] = "選択肢が更新されました。";
          continue;
        }
        body.append(option.name, option.value);
      }
      continue;
    }
    if (typeof value !== "string") {
      fieldErrors[field.controlId] = "入力形式を確認してください。";
      continue;
    }
    body.append(field.name, value);
  }
  if (Object.keys(fieldErrors).length > 0) return { kind: "invalid", fieldErrors, message: "入力内容を確認してください。" };
  if (action.name !== undefined) body.append(action.name, action.value ?? "");
  return { kind: "ready", action: form.action, body, method: form.method };
}
