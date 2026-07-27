import { z } from "zod";

export const AiTextFormatSchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(4)]);
export type AiTextFormat = z.infer<typeof AiTextFormatSchema>;

export const AiReviewInputSchema = z.object({
  excerpt: z.string().trim().min(24).max(6_000),
  format: AiTextFormatSchema,
  intent: z.enum(["gaps", "paragraphs"]),
}).strict();
export type AiReviewInput = Readonly<z.infer<typeof AiReviewInputSchema>>;

export const AiReviewResultSchema = z.object({
  gaps: z.array(z.string()),
  paragraphs: z.array(z.string()),
  summary: z.string(),
}).strict();
export type AiReviewResult = Readonly<z.infer<typeof AiReviewResultSchema>>;

export const AiReviewResponseSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), result: AiReviewResultSchema }),
  z.object({ ok: z.literal(false), error: z.object({ code: z.string().min(1).max(80) }) }),
]);
