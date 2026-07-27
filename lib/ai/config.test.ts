import { describe, expect, test } from "bun:test";

import { AiConfigurationError, createAiRuntimeConfig, toAiAvailability } from "./config";

describe("OpenAI-compatible AI configuration", () => {
  test("accepts LM Studio and Ollama loopback endpoints without an API key", () => {
    for (const baseUrl of ["http://127.0.0.1:1234/v1", "http://127.0.0.1:11434/v1"]) {
      const config = createAiRuntimeConfig({
        baseUrl,
        enabled: "true",
        model: "local-model",
        safetySecret: "a".repeat(32),
      });
      expect(config).toMatchObject({ baseUrl, enabled: true, model: "local-model" });
      expect(toAiAvailability(config)).toEqual({ enabled: true, provider: "OpenAI compatible" });
    }
  });

  test("requires HTTPS for a non-local compatible endpoint", () => {
    expect(() => createAiRuntimeConfig({
      baseUrl: "http://model.example/v1",
      enabled: "true",
      safetySecret: "a".repeat(32),
    })).toThrow(AiConfigurationError);
  });
});
