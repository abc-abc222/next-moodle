import type { ActivityAdapterPayload } from "@/lib/moodle/activities/contracts";

export type QuestionnaireData = NonNullable<ActivityAdapterPayload["activity"]> & {
  kind: "questionnaire";
};
export type QuestionnaireQuestion = QuestionnaireData["questions"][number];
export type RateAnswer = Readonly<Record<string, string>>;
export type QuestionnaireAnswer = string | readonly string[] | RateAnswer;
export type QuestionnaireAnswers = Readonly<Record<string, QuestionnaireAnswer>>;

export function isRateAnswer(value: QuestionnaireAnswer | undefined): value is RateAnswer {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function initialQuestionnaireAnswers(data: QuestionnaireData): QuestionnaireAnswers {
  return Object.fromEntries(data.answers.map((answer) => [
    String(answer.questionId),
    answer.rateValues.length > 0
      ? Object.fromEntries(answer.rateValues.map((value) => [value.choiceId, value.value]))
      : answer.values.length <= 1 ? answer.values[0] ?? "" : answer.values,
  ]));
}

export function questionnaireAnswerIsComplete(
  question: QuestionnaireQuestion,
  answer: QuestionnaireAnswer | undefined,
): boolean {
  if (question.kind === "rate") {
    return isRateAnswer(answer) && question.options.every(
      (row) => answer[row.value] !== undefined && answer[row.value] !== "",
    );
  }
  return Array.isArray(answer)
    ? answer.length > 0
    : typeof answer === "string" && answer !== "";
}

export function questionnaireQuestionIsVisible(
  question: QuestionnaireQuestion,
  answers: QuestionnaireAnswers,
): boolean {
  return question.dependencies.every((dependency) => {
    const value = answers[String(dependency.questionId)];
    const matches = Array.isArray(value)
      ? value.includes(dependency.value)
      : isRateAnswer(value)
        ? Object.values(value).includes(dependency.value)
        : value === dependency.value;
    return dependency.logic === "equals" ? matches : !matches;
  });
}

export function visibleQuestionnaireQuestions(
  questions: readonly QuestionnaireQuestion[],
  answers: QuestionnaireAnswers,
): readonly QuestionnaireQuestion[] {
  return questions.filter((question) => questionnaireQuestionIsVisible(question, answers));
}

function isAnswerableQuestion(question: QuestionnaireQuestion): boolean {
  return question.kind !== "info" && question.kind !== "pagebreak";
}

export function questionnaireProgress(
  questions: readonly QuestionnaireQuestion[],
  answers: QuestionnaireAnswers,
): Readonly<{
  answered: number;
  required: number;
  requiredAnswered: number;
  total: number;
}> {
  const answerable = visibleQuestionnaireQuestions(questions, answers).filter(isAnswerableQuestion);
  const required = answerable.filter((question) => question.required);
  return {
    answered: answerable.filter((question) => (
      questionnaireAnswerIsComplete(question, answers[String(question.id)])
    )).length,
    required: required.length,
    requiredAnswered: required.filter((question) => (
      questionnaireAnswerIsComplete(question, answers[String(question.id)])
    )).length,
    total: answerable.length,
  };
}

export function missingRequiredQuestionnaireQuestions(
  questions: readonly QuestionnaireQuestion[],
  answers: QuestionnaireAnswers,
): readonly QuestionnaireQuestion[] {
  return visibleQuestionnaireQuestions(questions, answers).filter((question) => (
    isAnswerableQuestion(question) &&
    question.required &&
    !questionnaireAnswerIsComplete(question, answers[String(question.id)])
  ));
}

export function questionnaireAnswerSummary(
  question: QuestionnaireQuestion,
  answer: QuestionnaireAnswer | undefined,
): readonly string[] {
  if (!questionnaireAnswerIsComplete(question, answer)) return [];
  if (question.kind === "rate" && isRateAnswer(answer)) {
    return question.options.map((row) => {
      const value = answer[row.value];
      const label = question.rateOptions.find((option) => option.value === value)?.label ?? "回答済み";
      return `${row.label}: ${label}`;
    });
  }
  if (Array.isArray(answer)) {
    return answer.map((value) => (
      question.options.find((option) => option.value === value)?.label ?? "回答済み"
    ));
  }
  if (typeof answer !== "string") return [];
  if (["radio", "scale", "select", "yesno"].includes(question.kind)) {
    return [question.options.find((option) => option.value === answer)?.label ?? "回答済み"];
  }
  return [answer];
}
