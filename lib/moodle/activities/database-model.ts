import { moodleDocumentFromHtml, type MoodleDocument } from "@/lib/moodle/html";

export type DatabaseFieldWire = Readonly<{
  description: string;
  id: number;
  name: string;
  param1: string | null;
  required: boolean;
  type: string;
}>;

export type DatabaseField = Readonly<{
  description: string;
  id: number;
  kind: "checkbox" | "number" | "select" | "text" | "textarea" | "unsupported" | "url";
  name: string;
  options: readonly string[];
  required: boolean;
}>;

export type DatabaseActivityData = Readonly<{
  canAdd: boolean;
  entries: MoodleDocument;
  fields: readonly DatabaseField[];
  id: number;
  name: string;
  total: number;
}>;

function fieldKind(type: string): DatabaseField["kind"] {
  if (type === "textarea") return "textarea";
  if (type === "number") return "number";
  if (type === "url") return "url";
  if (type === "menu" || type === "radiobutton") return "select";
  if (type === "checkbox" || type === "multimenu") return "checkbox";
  if (type === "text") return "text";
  return "unsupported";
}

export function projectDatabaseFields(fields: readonly DatabaseFieldWire[]): readonly DatabaseField[] {
  return fields.map((field) => ({
    description: field.description,
    id: field.id,
    kind: fieldKind(field.type),
    name: field.name,
    options: (field.param1 ?? "")
      .split(/\r?\n/)
      .map((option) => option.trim())
      .filter((option) => option.length > 0)
      .slice(0, 200),
    required: field.required,
  }));
}

export function encodeDatabaseFieldValue(
  field: DatabaseField,
  value: string | readonly string[],
): string {
  if (field.kind === "checkbox") {
    return JSON.stringify(Array.isArray(value) ? value : [value]);
  }
  return JSON.stringify(Array.isArray(value) ? (value[0] ?? "") : value);
}

export function projectDatabaseActivity(input: Readonly<{
  canAdd: boolean;
  entriesHtml: string;
  fields: readonly DatabaseFieldWire[];
  id: number;
  name: string;
  siteUrl: string;
  total: number;
}>): DatabaseActivityData {
  return {
    canAdd: input.canAdd,
    entries: moodleDocumentFromHtml(input.entriesHtml, { siteUrl: input.siteUrl }),
    fields: projectDatabaseFields(input.fields),
    id: input.id,
    name: input.name,
    total: input.total,
  };
}
