import { z } from "zod";

import { limitReviewResult } from "./context";
import { AiReviewResultSchema, type AiReviewResult, type AiTextFormat } from "./contracts";

const ChatCompletionSchema = z.object({
  choices: z.array(z.object({
    message: z.object({ content: z.string().nullable().optional() }),
  })).min(1),
});

export class AiProviderError extends Error {
  override readonly name = "AiProviderError";
  readonly code: "access_forbidden" | "ai_provider_rate_limited" | "ai_timeout" | "ai_unavailable";

  constructor(code: AiProviderError["code"]) {
    super("AI provider request failed.");
    this.code = code;
  }
}

export type AiReviewProviderInput = Readonly<{
  excerpt: string;
  format: AiTextFormat;
  intent: "gaps" | "paragraphs";
  signal: AbortSignal;
  taskDescription: string;
  taskTitle: string;
}>;

type OpenAiCompatibleProviderOptions = Readonly<{
  apiKey: string;
  baseUrl: string;
  model: string;
}>;

function formatName(format: AiTextFormat): string {
  return format === 1 ? "HTML" : format === 4 ? "Markdown" : "プレーンテキスト";
}

function responseJson(value: string): unknown {
  const stripped = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(stripped);
}

export class OpenAiCompatibleWritingProvider {
  readonly #options: OpenAiCompatibleProviderOptions;

  constructor(options: OpenAiCompatibleProviderOptions) {
    this.#options = options;
  }

  async review(input: AiReviewProviderInput): Promise<AiReviewResult> {
    const instructions = input.intent === "gaps"
      ? "学習者の文章に不足する説明を確認してください。根拠のない事実、数値、引用、参考文献を作らず、本文を代筆しないでください。"
      : "学習者の文章を補う、最大3つの短い段落案を作ってください。根拠のない事実、数値、引用、参考文献を作らず、全文を代筆しないでください。";
    const request = {
      max_tokens: 900,
      messages: [
        {
          content: `${instructions}\n\n必ず次のJSONだけを返してください。\n{"summary":"簡潔な要約","gaps":["不足点"],"paragraphs":["補足段落"]}\n不足点の確認ではparagraphsを空配列にし、補足段落ではgapsを空配列にできます。`,
          role: "system",
        },
        {
          content: `課題名:\n${input.taskTitle}\n\n課題文:\n${input.taskDescription.slice(0, 4_000)}\n\n入力形式: ${formatName(input.format)}\n\n確認対象:\n${input.excerpt}`,
          role: "user",
        },
      ],
      model: this.#options.model,
      temperature: 0.2,
    };
    let response: Response;
    try {
      response = await fetch(`${this.#options.baseUrl}/chat/completions`, {
        body: JSON.stringify(request),
        headers: {
          "Content-Type": "application/json",
          ...(this.#options.apiKey === "" ? {} : { Authorization: `Bearer ${this.#options.apiKey}` }),
        },
        method: "POST",
        signal: input.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "TimeoutError") throw new AiProviderError("ai_timeout");
      throw new AiProviderError("ai_unavailable");
    }
    if (response.status === 401 || response.status === 403) throw new AiProviderError("access_forbidden");
    if (response.status === 429) throw new AiProviderError("ai_provider_rate_limited");
    if (!response.ok) throw new AiProviderError("ai_unavailable");
    const envelope = ChatCompletionSchema.safeParse(await response.json());
    const content = envelope.success ? envelope.data.choices[0]?.message.content : undefined;
    if (content === undefined || content === null) throw new AiProviderError("ai_unavailable");
    try {
      const parsed = AiReviewResultSchema.safeParse(responseJson(content));
      if (!parsed.success) throw new AiProviderError("ai_unavailable");
      return limitReviewResult(parsed.data);
    } catch (error) {
      if (error instanceof AiProviderError) throw error;
      throw new AiProviderError("ai_unavailable");
    }
  }
}
