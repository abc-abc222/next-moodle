"use client";

import { QuestionnaireWorkspace } from "@/components/activities/questionnaire-workspace";
import type { QuestionnaireData } from "@/components/activities/questionnaire-model";
import "@/components/activities/activities.css";

import { ShowcaseSample, ShowcaseSection } from "./showcase-frame";
import styles from "./showcase.module.css";

const EMPTY_QUESTIONNAIRE: QuestionnaireData = {
  kind: "questionnaire",
  anonymous: false,
  answers: [],
  availableFrom: 0,
  availableUntil: 0,
  canSave: true,
  canSubmit: true,
  canViewResponses: false,
  questions: [
    {
      dependencies: [],
      description: "出席状況を選択してください。",
      id: 8101,
      kind: "yesno",
      label: "本日の授業に出席していますか",
      max: null,
      min: null,
      options: [
        { label: "はい", value: "yes" },
        { label: "いいえ", value: "no" },
      ],
      rateOptions: [],
      required: true,
      step: null,
    },
    {
      dependencies: [],
      description: "必要な連絡がある場合のみ入力してください。",
      id: 8102,
      kind: "textarea",
      label: "担当者への連絡",
      max: 1_000,
      min: null,
      options: [],
      rateOptions: [],
      required: false,
      step: null,
    },
    {
      dependencies: [],
      description: "各項目について1つずつ選択してください。",
      id: 8103,
      kind: "rate",
      label: "受講環境の確認",
      max: null,
      min: null,
      options: [
        { label: "教材を確認できる", value: "material" },
        { label: "課題を提出できる", value: "submission" },
      ],
      rateOptions: [
        { label: "問題なし", value: "ready" },
        { label: "支援が必要", value: "support" },
      ],
      required: true,
      step: null,
    },
  ],
  responseId: 0,
  status: "not_started",
};

const ANSWERED_QUESTIONNAIRE: QuestionnaireData = {
  ...EMPTY_QUESTIONNAIRE,
  answers: [
    { questionId: 8101, rateValues: [], values: ["yes"] },
    { questionId: 8102, rateValues: [], values: ["教材を確認しました。"] },
    {
      questionId: 8103,
      rateValues: [
        { choiceId: "material", value: "ready" },
        { choiceId: "submission", value: "support" },
      ],
      values: [],
    },
  ],
  responseId: 42,
  status: "in_progress",
};

const SUBMITTED_QUESTIONNAIRE: QuestionnaireData = {
  ...ANSWERED_QUESTIONNAIRE,
  canSave: false,
  canSubmit: false,
  status: "submitted",
};

export function QuestionnaireShowcase() {
  return (
    <ShowcaseSection
      description="通常入力、必須エラー、送信前確認、送信済みを実部品で確認します。評定表は狭い幅で選択カードへ切り替わります。"
      eyebrow="05 / Questionnaire"
      id="questionnaire-showcase"
      title="Answer, review, and submit"
    >
      <div className={styles.questionnaireGrid}>
        <ShowcaseSample label="通常・評定表">
          <div className={styles.questionnaireSpecimen} data-testid="questionnaire-editing-showcase">
            <QuestionnaireWorkspace cmid={9198} data={EMPTY_QUESTIONNAIRE} />
          </div>
        </ShowcaseSample>
        <ShowcaseSample label="必須エラー">
          <div className={styles.questionnaireSpecimen} data-testid="questionnaire-error-showcase">
            <QuestionnaireWorkspace cmid={9198} data={EMPTY_QUESTIONNAIRE} previewState="required-error" />
          </div>
        </ShowcaseSample>
        <ShowcaseSample label="送信前の確認">
          <div className={styles.questionnaireSpecimen} data-testid="questionnaire-review-showcase">
            <QuestionnaireWorkspace cmid={9198} data={ANSWERED_QUESTIONNAIRE} previewState="reviewing" />
          </div>
        </ShowcaseSample>
        <ShowcaseSample label="送信済み・読み取り専用">
          <div className={styles.questionnaireSpecimen} data-testid="questionnaire-submitted-showcase">
            <QuestionnaireWorkspace cmid={9198} data={SUBMITTED_QUESTIONNAIRE} />
          </div>
        </ShowcaseSample>
      </div>
    </ShowcaseSection>
  );
}
