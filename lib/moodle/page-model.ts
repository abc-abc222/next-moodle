import { z } from "zod";

import type { MoodleDocument } from "./html";

export type MoodleFormOption = Readonly<{
  disabled: boolean;
  id: string;
  label: string;
}>;

type MoodleBaseControl = Readonly<{
  description?: string;
  disabled: boolean;
  id: string;
  label: string;
  required: boolean;
}>;

export type MoodleFormControl =
  | (MoodleBaseControl & Readonly<{ kind: "text" | "email" | "number" | "date" | "datetime" | "range"; max?: string; maxLength?: number; min?: string; placeholder?: string; step?: string; value: string }>)
  | (MoodleBaseControl & Readonly<{ kind: "textarea"; maxLength?: number; rows?: number; value: string }>)
  | (MoodleBaseControl & Readonly<{ kind: "checkbox"; checked: boolean }>)
  | (MoodleBaseControl & Readonly<{ kind: "radio" | "checkboxes" | "select"; multiple: boolean; options: readonly MoodleFormOption[]; selected: readonly string[] }>);

export type MoodleFormAction = Readonly<{
  id: string;
  intent: "primary" | "secondary";
  label: string;
  purpose: "delete" | "next" | "other" | "previous" | "save" | "search" | "submit";
}>;

export type MoodleFormModel = Readonly<{
  actions: readonly MoodleFormAction[];
  controls: readonly MoodleFormControl[];
  errors: Readonly<Record<string, string>>;
  id: string;
  method: "get" | "post";
  revision: string;
  title: string;
}>;

export type MoodleScreenModel = Readonly<{
  document: MoodleDocument;
  forms: readonly MoodleFormModel[];
  notices: readonly Readonly<{ message: string; tone: "info" | "success" | "warning" | "error" }>[];
  revision: string;
  state: "ready" | "closed" | "forbidden";
  title: string;
}>;

const GenericMoodleValueSchema = z.union([
  z.string().max(100_000),
  z.boolean(),
  z.array(z.string().max(4_096)).max(1_000),
]);

export const GenericMoodleFormSubmissionSchema = z.object({
  actionId: z.string().min(1).max(64),
  formId: z.string().min(1).max(64),
  revision: z.string().regex(/^[a-f0-9]{64}$/),
  values: z.record(z.string().min(1).max(64), GenericMoodleValueSchema),
});
export type GenericMoodleFormSubmission = z.infer<typeof GenericMoodleFormSubmissionSchema>;
