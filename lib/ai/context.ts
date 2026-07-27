import { createHash, createHmac } from "node:crypto";
import sanitizeHtml from "sanitize-html";

import type { AiReviewResult } from "./contracts";

const BLOCK_TAG_PATTERN = /<\/?(?:address|article|aside|blockquote|br|div|h[1-6]|header|hr|li|main|ol|p|pre|section|table|tr|ul)[^>]*>/gi;

export function plainTextFromHtml(value: string): string {
  return sanitizeHtml(value.replace(BLOCK_TAG_PATTERN, "\n"), { allowedAttributes: {}, allowedTags: [] })
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line !== "")
    .join("\n");
}

export function createAiConsentStorageKey(input: Readonly<{ siteUrl: string; userId: number }>): string {
  const digest = createHash("sha256")
    .update(`ai-consent|${new URL(input.siteUrl).origin}|${input.userId}`)
    .digest("base64url");
  return `next-moodle:ai-consent:${digest}`;
}

export function createSafetyIdentifier(input: Readonly<{ safetySecret: string; siteUrl: string; userId: number }>): string {
  const digest = createHmac("sha256", input.safetySecret)
    .update(`ai-safety|${new URL(input.siteUrl).origin}|${input.userId}`)
    .digest("base64url");
  return `nm_${digest}`;
}

export function limitReviewResult(input: AiReviewResult): AiReviewResult {
  const paragraphs = input.paragraphs
    .map((paragraph) => paragraph.trim().slice(0, 600))
    .filter((paragraph) => paragraph !== "")
    .slice(0, 3);
  return {
    gaps: input.gaps
      .map((gap) => gap.replace(/\s+/g, " ").trim().slice(0, 240))
      .filter((gap) => gap !== "")
      .slice(0, 5),
    paragraphs,
    summary: input.summary.replace(/\s+/g, " ").trim().slice(0, 400),
  };
}
