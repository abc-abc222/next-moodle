import { z } from "zod";

import { moodleDocumentFromHtml, type MoodleDocument } from "@/lib/moodle/html";

const MoodleBooleanSchema = z.union([z.boolean(), z.number().int().min(0).max(1)])
  .transform((value) => value === true || value === 1);

export const WikiPageWireSchema = z.object({
  cachedcontent: z.string().max(1_000_000).optional().default(""),
  caneditpage: MoodleBooleanSchema.optional().default(false),
  id: z.number().int().positive(),
  readonly: MoodleBooleanSchema.optional().default(false),
  subwikiid: z.number().int(),
  timecreated: z.number().int().nonnegative().optional().default(0),
  timemodified: z.number().int().nonnegative().optional().default(0),
  title: z.string().min(1).max(16_384),
});

export type WikiPageWire = Readonly<z.input<typeof WikiPageWireSchema>>;

export type WikiActivityData = Readonly<{
  canCreate: boolean;
  format: string;
  id: number;
  name: string;
  pages: readonly Readonly<{
    canEdit: boolean;
    content: MoodleDocument;
    createdAt: number;
    id: number;
    title: string;
    updatedAt: number;
  }>[];
}>;

export function projectWikiActivity(input: Readonly<{
  canCreate?: boolean;
  format?: string;
  id: number;
  name: string;
  pages: readonly WikiPageWire[];
  siteUrl: string;
}>): WikiActivityData {
  return {
    canCreate: input.canCreate ?? false,
    format: input.format ?? "html",
    id: input.id,
    name: input.name,
    pages: input.pages.map((raw) => {
      const page = WikiPageWireSchema.parse(raw);
      return {
        canEdit: page.caneditpage && !page.readonly,
        content: moodleDocumentFromHtml(page.cachedcontent, { siteUrl: input.siteUrl }),
        createdAt: page.timecreated,
        id: page.id,
        title: page.title,
        updatedAt: page.timemodified,
      };
    }),
  };
}
