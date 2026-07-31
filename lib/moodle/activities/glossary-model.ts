import { z } from "zod";

import { moodleDocumentFromHtml, type MoodleDocument } from "@/lib/moodle/html";

const MoodleBooleanSchema = z.union([z.boolean(), z.number().int().min(0).max(1)])
  .transform((value) => value === true || value === 1);

export const GlossaryEntryWireSchema = z.object({
  approved: MoodleBooleanSchema.optional().default(true),
  concept: z.string().min(1).max(16_384),
  definition: z.string().max(1_000_000),
  id: z.number().int().positive(),
  timecreated: z.number().int().nonnegative().optional().default(0),
  timemodified: z.number().int().nonnegative().optional().default(0),
  userfullname: z.string().max(500).optional().default("参加者"),
});

export type GlossaryEntryWire = Readonly<z.input<typeof GlossaryEntryWireSchema>>;

export type GlossaryActivityData = Readonly<{
  canAdd: boolean;
  entries: readonly Readonly<{
    approved: boolean;
    author: string;
    concept: string;
    createdAt: number;
    definition: MoodleDocument;
    id: number;
    updatedAt: number;
  }>[];
  id: number;
  name: string;
  total: number;
}>;

export function projectGlossaryActivity(input: Readonly<{
  canAdd: boolean;
  entries: readonly GlossaryEntryWire[];
  id: number;
  name: string;
  siteUrl: string;
  total: number;
}>): GlossaryActivityData {
  return {
    canAdd: input.canAdd,
    entries: input.entries.map((raw) => {
      const entry = GlossaryEntryWireSchema.parse(raw);
      return {
        approved: entry.approved,
        author: entry.userfullname,
        concept: entry.concept,
        createdAt: entry.timecreated,
        definition: moodleDocumentFromHtml(entry.definition, { siteUrl: input.siteUrl }),
        id: entry.id,
        updatedAt: entry.timemodified,
      };
    }),
    id: input.id,
    name: input.name,
    total: input.total,
  };
}
