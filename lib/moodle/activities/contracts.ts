import { z } from "zod";

import { plainTextFromMoodleMessage } from "@/lib/security/html";

import {
  ActivityModuleNameSchema,
  CapabilityStateSchema,
} from "../capabilities";

export const ACTIVITY_OPERATION_KEYS = [
  "read", "viewEvent", "complete", "save", "submit", "reply", "subscribe",
  "start", "review", "launch",
] as const;
export const ActivityOperationKeySchema = z.enum(ACTIVITY_OPERATION_KEYS);
export type ActivityOperationKey = z.infer<typeof ActivityOperationKeySchema>;

export const ActivityDisplayBlockSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), heading: z.string().max(200), text: z.string().max(20_000) }),
  z.object({ kind: z.literal("facts"), items: z.array(z.object({ label: z.string().max(120), value: z.string().max(500) })).max(24) }),
  z.object({ kind: z.literal("list"), heading: z.string().max(200), items: z.array(z.string().max(2_000)).max(100) }),
  z.object({ kind: z.literal("notice"), tone: z.enum(["info", "warning", "danger"]), text: z.string().max(2_000) }),
  z.object({ kind: z.literal("launch"), label: z.string().max(120), url: z.url() }),
]);
export type ActivityDisplayBlock = z.infer<typeof ActivityDisplayBlockSchema>;

const ActivityAdapterPayloadModelSchema = z.object({
  contractVersion: z.literal(2),
  cmid: z.number().int().positive(),
  moduleName: z.string().min(1).max(128),
  source: z.enum(["companion", "runtime"]),
  title: z.string().min(1).max(500),
  state: CapabilityStateSchema,
  operations: z.array(ActivityOperationKeySchema).max(20),
  blocks: z.array(ActivityDisplayBlockSchema).max(100),
  activity: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("questionnaire"),
      anonymous: z.boolean(),
      answers: z.array(z.object({
        questionId: z.number().int().positive(),
        rateValues: z.array(z.object({ choiceId: z.string().max(500), value: z.string().max(500) })).max(200).default([]),
        values: z.array(z.string().max(10_000)).max(100),
      })).max(500),
      availableFrom: z.number().int().nonnegative(),
      availableUntil: z.number().int().nonnegative(),
      canSave: z.boolean(),
      canSubmit: z.boolean(),
      canViewResponses: z.boolean(),
      questions: z.array(z.object({
        dependencies: z.array(z.object({ logic: z.enum(["equals", "not_equals"]), questionId: z.number().int().positive(), value: z.string().max(2_000) })).max(20),
        description: z.string().max(20_000),
        id: z.number().int().positive(),
        kind: z.enum(["checkbox", "date", "info", "number", "pagebreak", "radio", "rate", "scale", "select", "text", "textarea", "yesno"]),
        label: z.string().max(20_000),
        max: z.number().nullable(),
        min: z.number().nullable(),
        options: z.array(z.object({ label: z.string().max(2_000), value: z.string().max(500) })).max(200),
        rateOptions: z.array(z.object({ label: z.string().max(2_000), value: z.string().max(500) })).max(100).default([]),
        required: z.boolean(),
        step: z.number().positive().nullable(),
      })).max(500),
      responseId: z.number().int().nonnegative(),
      status: z.enum(["not_started", "in_progress", "submitted", "closed"]),
    }),
  ]).nullable(),
});
export const ActivityAdapterPayloadSchema = z.object({
  contractversion: z.literal(2),
  cmid: z.number().int().positive(),
  modulename: z.string().min(1).max(128),
  source: z.enum(["companion", "runtime"]),
  title: z.string().min(1).max(500),
  state: CapabilityStateSchema,
  operations: z.array(ActivityOperationKeySchema).max(20),
  blocks: z.array(ActivityDisplayBlockSchema).max(100),
  activity: z.unknown().nullable().optional(),
}).transform((wire) => {
  const payload = ActivityAdapterPayloadModelSchema.parse({
    contractVersion: wire.contractversion,
    cmid: wire.cmid,
    moduleName: wire.modulename,
    source: wire.source,
    title: wire.title,
    state: wire.state,
    operations: wire.operations,
    blocks: wire.blocks,
    activity: wire.activity ?? null,
  });
  if (payload.activity?.kind !== "questionnaire") return payload;
  return {
    ...payload,
    activity: {
      ...payload.activity,
      questions: payload.activity.questions.map((question) => ({
        ...question,
        description: plainTextFromMoodleMessage(question.description),
        label: plainTextFromMoodleMessage(question.label),
        options: question.options.map((option) => ({
          ...option,
          label: plainTextFromMoodleMessage(option.label),
        })),
        rateOptions: question.rateOptions.map((option) => ({
          ...option,
          label: plainTextFromMoodleMessage(option.label),
        })),
      })),
    },
  };
});
export type ActivityAdapterPayload = Readonly<
  z.infer<typeof ActivityAdapterPayloadSchema>
>;

const CompanionManifestModelSchema = z.object({
  contractVersion: z.literal(2),
  adapters: z.array(z.object({
    moduleName: z.string().min(1).max(128),
    operations: z.array(ActivityOperationKeySchema).max(20),
  })).max(200),
});
export const CompanionManifestSchema = z.object({
  contractversion: z.literal(2),
  adapters: z.array(z.object({
    modulename: z.string().min(1).max(128),
    operations: z.array(ActivityOperationKeySchema).max(20),
  })).max(200),
}).transform((wire) => CompanionManifestModelSchema.parse({
  contractVersion: wire.contractversion,
  adapters: wire.adapters.map((adapter) => ({
    moduleName: adapter.modulename,
    operations: adapter.operations,
  })),
}));
export type CompanionManifest = Readonly<z.infer<typeof CompanionManifestSchema>>;

export const OfficialActivityAdapterSchema = z.object({
  moduleName: ActivityModuleNameSchema,
  label: z.string().min(1).max(80),
  operations: z.array(ActivityOperationKeySchema),
  workspace: z.enum(["document", "submission", "assessment", "discussion", "form", "launch"]),
});
export type OfficialActivityAdapter = Readonly<
  z.infer<typeof OfficialActivityAdapterSchema>
>;
