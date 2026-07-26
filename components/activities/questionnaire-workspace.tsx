"use client";

import {
  ArrowLeft,
  Check,
  CheckCircle,
  FloppyDisk,
  PaperPlaneRight,
  PencilSimple,
  Warning,
} from "@phosphor-icons/react";
import ky from "ky";
import {
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type RefObject,
} from "react";

import { Button, Notice } from "@/components/ui";

import {
  initialQuestionnaireAnswers,
  isRateAnswer,
  missingRequiredQuestionnaireQuestions,
  questionnaireAnswerIsComplete,
  questionnaireAnswerSummary,
  questionnaireProgress,
  visibleQuestionnaireQuestions,
  type QuestionnaireAnswer,
  type QuestionnaireAnswers,
  type QuestionnaireData,
  type QuestionnaireQuestion,
} from "./questionnaire-model";

type WorkspaceView = "editing" | "reviewing" | "submitted";
type OperationStatus = "idle" | "dirty" | "saving" | "submitting" | "saved" | "error" | "submitted";
type QuestionnairePreviewState = "editing" | "required-error" | "reviewing";

function operationMessage(status: OperationStatus, message: string): string {
  if (message !== "") return message;
  switch (status) {
    case "dirty":
      return "未保存の変更があります";
    case "saving":
      return "下書きを保存しています";
    case "saved":
      return "下書きを保存しました";
    case "submitting":
      return "回答を送信しています";
    case "submitted":
      return "回答を送信しました";
    case "error":
      return "入力内容を確認してください";
    case "idle":
      return "回答は自動送信されません";
  }
}

function operationLabel(status: OperationStatus): string {
  switch (status) {
    case "dirty":
      return "未保存";
    case "saving":
      return "保存中";
    case "saved":
      return "保存済み";
    case "submitting":
      return "送信中";
    case "submitted":
      return "送信済み";
    case "error":
      return "要確認";
    case "idle":
      return "入力中";
  }
}

function answerStatusLabel(
  question: QuestionnaireQuestion,
  answer: QuestionnaireAnswer | undefined,
  hasError: boolean,
): string {
  if (hasError) return "確認が必要";
  if (questionnaireAnswerIsComplete(question, answer)) return "回答済み";
  return question.required ? "未回答" : "任意";
}

export function QuestionnaireWorkspace({
  cmid,
  data,
  previewState,
}: Readonly<{
  cmid: number;
  data: QuestionnaireData;
  /** Development-only initial state used by /dev/ui. */
  previewState?: QuestionnairePreviewState;
}>) {
  const titleId = useId();
  const reviewTitleId = useId();
  const controlPrefix = useId();
  const initialAnswers = useMemo(() => initialQuestionnaireAnswers(data), [data]);
  const previewErrors = useMemo(() => (
    previewState === "required-error"
      ? Object.fromEntries(missingRequiredQuestionnaireQuestions(data.questions, initialAnswers).map((question) => [
        String(question.id),
        "この設問は必須です。",
      ]))
      : {}
  ), [data.questions, initialAnswers, previewState]);
  const [answers, setAnswers] = useState<QuestionnaireAnswers>(() => initialAnswers);
  const [responseId, setResponseId] = useState(data.responseId);
  const [view, setView] = useState<WorkspaceView>(
    data.status === "submitted" ? "submitted" : previewState === "reviewing" ? "reviewing" : "editing",
  );
  const [operation, setOperation] = useState<OperationStatus>(
    data.status === "submitted"
      ? "submitted"
      : previewState === "required-error"
        ? "error"
        : data.status === "in_progress"
          ? "saved"
          : "idle",
  );
  const [message, setMessage] = useState(
    previewState === "required-error"
      ? `未回答の必須設問が${Object.keys(previewErrors).length}件あります。`
      : "",
  );
  const [questionErrors, setQuestionErrors] = useState<Readonly<Record<string, string>>>(previewErrors);
  const questionRefs = useRef(new Map<number, HTMLFieldSetElement>());
  const reviewHeadingRef = useRef<HTMLHeadingElement>(null);

  const visibleQuestions = useMemo(
    () => visibleQuestionnaireQuestions(data.questions, answers),
    [answers, data.questions],
  );
  const answerableQuestions = useMemo(
    () => visibleQuestions.filter((question) => question.kind !== "info" && question.kind !== "pagebreak"),
    [visibleQuestions],
  );
  const progress = useMemo(
    () => questionnaireProgress(data.questions, answers),
    [answers, data.questions],
  );
  const busy = operation === "saving" || operation === "submitting";

  function focusQuestion(questionId: number): void {
    setView("editing");
    requestAnimationFrame(() => {
      const target = questionRefs.current.get(questionId);
      if (target === undefined) return;
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
      target.focus({ preventScroll: true });
    });
  }

  function setAnswer(questionId: number, value: QuestionnaireAnswer): void {
    setAnswers((current) => ({ ...current, [String(questionId)]: value }));
    setOperation("dirty");
    setMessage("");
    setQuestionErrors((current) => {
      if (current[String(questionId)] === undefined) return current;
      const next = { ...current };
      delete next[String(questionId)];
      return next;
    });
  }

  function openReview(): void {
    const missing = missingRequiredQuestionnaireQuestions(data.questions, answers);
    const firstMissing = missing[0];
    if (firstMissing !== undefined) {
      setQuestionErrors(Object.fromEntries(missing.map((question) => [
        String(question.id),
        "この設問は必須です。",
      ])));
      setOperation("error");
      setMessage(`未回答の必須設問が${missing.length}件あります。`);
      focusQuestion(firstMissing.id);
      return;
    }
    setQuestionErrors({});
    setMessage("");
    setView("reviewing");
    requestAnimationFrame(() => reviewHeadingRef.current?.focus());
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (busy || view === "submitted") return;
    if (view === "editing") {
      openReview();
      return;
    }
    void persist("submit");
  }

  async function persist(action: "save" | "submit"): Promise<void> {
    if (busy || view === "submitted") return;
    setOperation(action === "save" ? "saving" : "submitting");
    setMessage("");
    try {
      const response = await ky.post(`/api/activities/${cmid}/adapter`, {
        json: { action, answers, responseId },
        retry: 0,
        throwHttpErrors: false,
        timeout: 20_000,
      });
      if (!response.ok) {
        setOperation("error");
        setMessage(response.status === 403
          ? "アクセスが禁止されています。"
          : action === "submit"
            ? "回答を送信できませんでした。入力内容はこの画面に保持されています。"
            : "回答を保存できませんでした。入力内容はこの画面に保持されています。");
        return;
      }
      const payload: unknown = await response.json().catch(() => null);
      if (
        typeof payload !== "object" || payload === null || !("ok" in payload) || payload.ok !== true ||
        !("result" in payload) || typeof payload.result !== "object" || payload.result === null
      ) {
        setOperation("error");
        setMessage(action === "submit"
          ? "回答を送信できませんでした。入力内容はこの画面に保持されています。"
          : "回答を保存できませんでした。入力内容はこの画面に保持されています。");
        return;
      }
      const result = payload.result as Record<string, unknown>;
      if (Array.isArray(result.warnings) && result.warnings.length > 0) {
        setOperation("error");
        setMessage("入力内容を確認してください。入力内容はこの画面に保持されています。");
        return;
      }
      if (typeof result.responseId === "number" && Number.isSafeInteger(result.responseId) && result.responseId >= 0) {
        setResponseId(result.responseId);
      }
      if (action === "save") {
        setOperation("saved");
        return;
      }
      if (result.state === "submitted") {
        setOperation("submitted");
        setView("submitted");
        return;
      }
      setOperation("error");
      setMessage("回答を送信できませんでした。入力内容はこの画面に保持されています。");
    } catch {
      setOperation("error");
      setMessage("通信に失敗しました。入力内容はこの画面に保持されています。時間をおいて再試行してください。");
    }
  }

  if (data.status === "closed") {
    return <Notice title="回答期間は終了しました" tone="warning"><p>回答内容の閲覧可否はアンケート設定に従います。</p></Notice>;
  }

  return (
    <section className="ui-questionnaire" aria-labelledby={titleId} data-view={view}>
      <QuestionnaireHeader
        anonymous={data.anonymous}
        operation={operation}
        progress={progress}
        titleId={titleId}
      />

      {view === "submitted" ? (
        <>
          <Notice title="回答を送信しました" tone="success">
            <p>このアンケートの回答はMoodleに保存されています。</p>
          </Notice>
          <QuestionnaireReview
            answers={answers}
            headingRef={reviewHeadingRef}
            titleId={reviewTitleId}
            questions={answerableQuestions}
            submitted
          />
        </>
      ) : (
        <form className="ui-questionnaire__form" noValidate onSubmit={handleSubmit}>
          {view === "editing" ? (
            <div className="ui-questionnaire__questions">
              {visibleQuestions.map((question) => {
                if (question.kind === "pagebreak") {
                  return <div aria-hidden className="ui-questionnaire__page-break" key={question.id}><span /></div>;
                }
                if (question.kind === "info") {
                  return (
                    <div className="ui-questionnaire__info" key={question.id}>
                      {question.label === "" ? null : <strong>{question.label}</strong>}
                      {question.description === "" ? null : <p>{question.description}</p>}
                    </div>
                  );
                }
                const index = answerableQuestions.findIndex((item) => item.id === question.id) + 1;
                return (
                  <QuestionnaireQuestionCard
                    answer={answers[String(question.id)]}
                    controlPrefix={controlPrefix}
                    disabled={busy}
                    error={questionErrors[String(question.id)]}
                    index={index}
                    key={question.id}
                    onChange={(next) => setAnswer(question.id, next)}
                    question={question}
                    setRef={(node) => {
                      if (node === null) questionRefs.current.delete(question.id);
                      else questionRefs.current.set(question.id, node);
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <QuestionnaireReview
              answers={answers}
              headingRef={reviewHeadingRef}
              onEdit={focusQuestion}
              questions={answerableQuestions}
              titleId={reviewTitleId}
            />
          )}

          <footer className="ui-questionnaire__actions">
            <span
              aria-live="polite"
              className="ui-questionnaire__operation"
              data-error={operation === "error" ? "true" : "false"}
              role={operation === "error" ? "alert" : "status"}
            >
              {operationMessage(operation, message)}
            </span>
            <div>
              {view === "editing" ? (
                <>
                  {data.canSave ? (
                    <Button
                      disabled={busy}
                      icon={<FloppyDisk aria-hidden size={17} />}
                      loading={operation === "saving"}
                      onClick={() => void persist("save")}
                      type="button"
                      variant="secondary"
                    >
                      下書き保存
                    </Button>
                  ) : null}
                  {data.canSubmit ? (
                    <Button
                      disabled={busy}
                      icon={<CheckCircle aria-hidden size={17} />}
                      type="submit"
                      variant="primary"
                    >
                      回答を確認
                    </Button>
                  ) : null}
                </>
              ) : (
                <>
                  <Button
                    disabled={busy}
                    icon={<ArrowLeft aria-hidden size={17} />}
                    onClick={() => setView("editing")}
                    type="button"
                    variant="secondary"
                  >
                    編集に戻る
                  </Button>
                  {data.canSubmit ? (
                    <Button
                      disabled={busy}
                      icon={<PaperPlaneRight aria-hidden size={17} />}
                      loading={operation === "submitting"}
                      type="submit"
                      variant="primary"
                    >
                      回答を送信
                    </Button>
                  ) : null}
                </>
              )}
            </div>
          </footer>
        </form>
      )}
    </section>
  );
}

function QuestionnaireHeader({
  anonymous,
  operation,
  progress,
  titleId,
}: Readonly<{
  anonymous: boolean;
  operation: OperationStatus;
  progress: ReturnType<typeof questionnaireProgress>;
  titleId: string;
}>) {
  const progressMaximum = Math.max(progress.total, 1);
  return (
    <header className="ui-questionnaire__header">
      <div className="ui-questionnaire__heading">
        <span>Questionnaire</span>
        <h2 id={titleId}>アンケート回答</h2>
        <p>入力した内容は、確認後に送信されます。</p>
      </div>
      <div className="ui-questionnaire__meta" aria-label="アンケートの状態">
        <span>{anonymous ? "匿名回答" : "記名回答"}</span>
        <span>{progress.answered} / {progress.total} 回答</span>
        <span data-emphasis={operation === "dirty" || operation === "error" ? "true" : "false"}>
          {operationLabel(operation)}
        </span>
      </div>
      <div className="ui-questionnaire__progress">
        <progress aria-label={`${progress.total}問中${progress.answered}問回答済み`} max={progressMaximum} value={progress.answered}>
          {progress.answered} / {progress.total}
        </progress>
        <small>必須 {progress.requiredAnswered} / {progress.required}</small>
      </div>
    </header>
  );
}

function QuestionnaireQuestionCard({
  answer,
  controlPrefix,
  disabled,
  error,
  index,
  onChange,
  question,
  setRef,
}: Readonly<{
  answer: QuestionnaireAnswer | undefined;
  controlPrefix: string;
  disabled: boolean;
  error: string | undefined;
  index: number;
  onChange: (value: QuestionnaireAnswer) => void;
  question: QuestionnaireQuestion;
  setRef: (node: HTMLFieldSetElement | null) => void;
}>) {
  const answered = questionnaireAnswerIsComplete(question, answer);
  const descriptionId = question.description === "" ? undefined : `${controlPrefix}-question-${question.id}-description`;
  const errorId = error === undefined ? undefined : `${controlPrefix}-question-${question.id}-error`;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <fieldset
      aria-describedby={describedBy}
      aria-invalid={error === undefined ? undefined : true}
      aria-required={question.required}
      className="ui-questionnaire__question"
      data-question-id={question.id}
      data-status={error === undefined ? answered ? "answered" : "unanswered" : "error"}
      ref={setRef}
      tabIndex={-1}
    >
      <legend>
        <span className="ui-questionnaire__number">{String(index).padStart(2, "0")}</span>
        <span>{question.label}</span>
      </legend>
      <div className="ui-questionnaire__question-meta">
        <span data-tone={error === undefined ? answered ? "success" : "neutral" : "error"}>
          {answered && error === undefined ? <Check aria-hidden size={14} weight="bold" /> : null}
          {answerStatusLabel(question, answer, error !== undefined)}
        </span>
        {question.required ? <span>必須</span> : <span>任意</span>}
      </div>
      {question.description === "" ? null : <p id={descriptionId}>{question.description}</p>}
      <QuestionControl
        answer={answer}
        controlPrefix={controlPrefix}
        disabled={disabled}
        onChange={onChange}
        question={question}
      />
      {error === undefined ? null : (
        <p className="ui-questionnaire__error" id={errorId}>
          <Warning aria-hidden size={17} weight="fill" />
          {error}
        </p>
      )}
    </fieldset>
  );
}

function QuestionnaireReview({
  answers,
  headingRef,
  onEdit,
  questions,
  submitted = false,
  titleId,
}: Readonly<{
  answers: QuestionnaireAnswers;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onEdit?: (questionId: number) => void;
  questions: readonly QuestionnaireQuestion[];
  submitted?: boolean;
  titleId: string;
}>) {
  return (
    <section className="ui-questionnaire__review" aria-labelledby={titleId}>
      <header>
        <div>
          <span>{submitted ? "Submitted" : "Review"}</span>
          <h3 id={titleId} ref={headingRef} tabIndex={-1}>
            {submitted ? "送信した回答" : "送信前の確認"}
          </h3>
        </div>
        <p>{submitted ? "送信時点の回答内容です。" : "内容を確認し、必要なら設問へ戻って修正できます。"}</p>
      </header>
      <ol>
        {questions.map((question, index) => {
          const summaries = questionnaireAnswerSummary(question, answers[String(question.id)]);
          return (
            <li key={question.id}>
              <span className="ui-questionnaire__number">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h4>{question.label}</h4>
                {summaries.length === 0 ? (
                  <p className="ui-questionnaire__unanswered">未回答（任意）</p>
                ) : summaries.map((summary, summaryIndex) => (
                  <p key={`${question.id}-${summaryIndex}`}>{summary}</p>
                ))}
              </div>
              {onEdit === undefined ? null : (
                <Button
                  icon={<PencilSimple aria-hidden size={16} />}
                  onClick={() => onEdit(question.id)}
                  size="compact"
                  type="button"
                  variant="ghost"
                >
                  編集
                </Button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function QuestionControl({
  answer,
  controlPrefix,
  disabled,
  onChange,
  question,
}: Readonly<{
  answer: QuestionnaireAnswer | undefined;
  controlPrefix: string;
  disabled: boolean;
  onChange: (value: QuestionnaireAnswer) => void;
  question: QuestionnaireQuestion;
}>) {
  const stringValue = typeof answer === "string" ? answer : "";
  if (question.kind === "textarea") {
    return (
      <textarea
        aria-label={question.label}
        disabled={disabled}
        maxLength={question.max ?? undefined}
        onChange={(event) => onChange(event.currentTarget.value)}
        rows={6}
        value={stringValue}
      />
    );
  }
  if (question.kind === "select") {
    return (
      <select
        aria-label={question.label}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.value)}
        value={stringValue}
      >
        <option value="">選択してください</option>
        {question.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    );
  }
  if (question.kind === "checkbox") {
    const selected = Array.isArray(answer) ? answer : [];
    return (
      <div className="ui-questionnaire__options">
        {question.options.map((option) => (
          <label data-selected={selected.includes(option.value) ? "true" : "false"} key={option.value}>
            <input
              checked={selected.includes(option.value)}
              disabled={disabled}
              onChange={(event) => onChange(event.currentTarget.checked
                ? [...selected, option.value]
                : selected.filter((item) => item !== option.value))}
              type="checkbox"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    );
  }
  if (question.kind === "rate") {
    const selected = isRateAnswer(answer) ? answer : {};
    const rateStyles = { "--rate-columns": question.rateOptions.length } as CSSProperties;
    return (
      <div
        aria-label={`${question.label} の評価`}
        className="ui-questionnaire__rate"
        data-dense={question.rateOptions.length > 8 ? "true" : "false"}
        role="group"
        style={rateStyles}
      >
        <div aria-hidden className="ui-questionnaire__rate-header">
          <span>項目</span>
          <div>{question.rateOptions.map((option) => <span key={option.value}>{option.label}</span>)}</div>
        </div>
        {question.options.map((row, rowIndex) => {
          const rowId = `${controlPrefix}-question-${question.id}-row-${rowIndex}`;
          return (
            <div className="ui-questionnaire__rate-row" key={row.value}>
              <p id={rowId}>{row.label}</p>
              <div aria-labelledby={rowId} className="ui-questionnaire__rate-options" role="radiogroup">
                {question.rateOptions.map((option, optionIndex) => {
                  const inputId = `${controlPrefix}-question-${question.id}-rate-${rowIndex}-${optionIndex}`;
                  return (
                    <label
                      data-selected={selected[row.value] === option.value ? "true" : "false"}
                      htmlFor={inputId}
                      key={option.value}
                    >
                      <input
                        aria-label={`${row.label}: ${option.label}`}
                        checked={selected[row.value] === option.value}
                        disabled={disabled}
                        id={inputId}
                        name={`${controlPrefix}-q-${question.id}-${row.value}`}
                        onChange={() => onChange({ ...selected, [row.value]: option.value })}
                        type="radio"
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  if (question.kind === "radio" || question.kind === "scale" || question.kind === "yesno") {
    return (
      <div className="ui-questionnaire__options">
        {question.options.map((option) => (
          <label data-selected={stringValue === option.value ? "true" : "false"} key={option.value}>
            <input
              checked={stringValue === option.value}
              disabled={disabled}
              name={`${controlPrefix}-q-${question.id}`}
              onChange={() => onChange(option.value)}
              type="radio"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    );
  }
  const inputType = question.kind === "date" ? "date" : question.kind === "number" ? "number" : "text";
  return (
    <input
      aria-label={question.label}
      disabled={disabled}
      max={inputType === "number" ? question.max ?? undefined : undefined}
      maxLength={inputType === "text" ? question.max ?? undefined : undefined}
      min={inputType === "number" ? question.min ?? undefined : undefined}
      onChange={(event) => onChange(event.currentTarget.value)}
      step={inputType === "number" ? question.step ?? undefined : undefined}
      type={inputType}
      value={stringValue}
    />
  );
}
