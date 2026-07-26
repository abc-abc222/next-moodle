import { describe, expect, test } from "bun:test";

import type { QuestionnaireQuestion } from "./questionnaire-model";
import {
  missingRequiredQuestionnaireQuestions,
  questionnaireAnswerIsComplete,
  questionnaireAnswerSummary,
  questionnaireProgress,
  questionnaireQuestionIsVisible,
} from "./questionnaire-model";

function question(
  overrides: Partial<QuestionnaireQuestion> & Pick<QuestionnaireQuestion, "id" | "kind" | "label">,
): QuestionnaireQuestion {
  return {
    dependencies: [],
    description: "",
    max: null,
    min: null,
    options: [],
    rateOptions: [],
    required: false,
    step: null,
    ...overrides,
  };
}

describe("Questionnaire presentation model", () => {
  test("checks required text and checkbox answers", () => {
    const text = question({ id: 1, kind: "text", label: "Name", required: true });
    const choices = question({
      id: 2,
      kind: "checkbox",
      label: "Equipment",
      options: [{ label: "Notebook", value: "10" }],
      required: true,
    });

    expect(questionnaireAnswerIsComplete(text, "")).toBe(false);
    expect(questionnaireAnswerIsComplete(text, "Alice")).toBe(true);
    expect(questionnaireAnswerIsComplete(choices, [])).toBe(false);
    expect(questionnaireAnswerIsComplete(choices, ["10"])).toBe(true);
  });

  test("requires every visible row in a rate table", () => {
    const rate = question({
      id: 3,
      kind: "rate",
      label: "Attendance",
      options: [
        { label: "Morning", value: "31" },
        { label: "Afternoon", value: "32" },
      ],
      rateOptions: [
        { label: "Present", value: "present" },
        { label: "Absent", value: "absent" },
      ],
      required: true,
    });

    expect(questionnaireAnswerIsComplete(rate, { "31": "present" })).toBe(false);
    expect(questionnaireAnswerIsComplete(rate, { "31": "present", "32": "absent" })).toBe(true);
    expect(questionnaireAnswerSummary(rate, { "31": "present", "32": "absent" })).toEqual([
      "Morning: Present",
      "Afternoon: Absent",
    ]);
  });

  test("excludes hidden dependencies from progress and required errors", () => {
    const parent = question({
      id: 4,
      kind: "yesno",
      label: "Continue",
      options: [{ label: "Yes", value: "y" }, { label: "No", value: "n" }],
      required: true,
    });
    const child = question({
      dependencies: [{ logic: "equals", questionId: 4, value: "y" }],
      id: 5,
      kind: "text",
      label: "Reason",
      required: true,
    });

    expect(questionnaireQuestionIsVisible(child, { "4": "n" })).toBe(false);
    expect(questionnaireProgress([parent, child], { "4": "n" })).toEqual({
      answered: 1,
      required: 1,
      requiredAnswered: 1,
      total: 1,
    });
    expect(missingRequiredQuestionnaireQuestions([parent, child], { "4": "n" })).toEqual([]);
    expect(missingRequiredQuestionnaireQuestions([parent, child], { "4": "y" })).toEqual([child]);
  });
});
