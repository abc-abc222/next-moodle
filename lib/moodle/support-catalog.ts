import type {
  CapabilityDelivery,
  CapabilityState,
  MoodleCapabilityManifest,
  StudentFeatureKey,
} from "./capabilities";
import {
  ACTIVITY_MODULE_NAMES,
  activityDeliveryFor,
  featureDeliveryFor,
} from "./capabilities";

export type StudentSupportCatalogEntry = Readonly<{
  delivery: CapabilityDelivery;
  id: string;
  kind: "activity" | "feature";
  label: string;
  state: CapabilityState;
}>;

const FEATURE_LABELS: Readonly<Record<StudentFeatureKey, string>> = {
  dashboard: "ダッシュボード",
  courses: "コース",
  resources: "教材",
  completion: "進捗確認",
  completionUpdate: "進捗更新",
  favorites: "コースのスター",
  assignmentsRead: "課題の確認",
  assignmentsSubmit: "課題の下書き保存",
  assignmentsFinalize: "課題の提出",
  assignmentFeedback: "課題フィードバック",
  quizzes: "小テスト",
  forums: "フォーラム",
  choice: "投票",
  feedback: "フィードバック",
  lesson: "レッスン",
  glossary: "用語集",
  wiki: "Wiki",
  database: "データベース",
  workshop: "ワークショップ",
  scorm: "SCORM",
  h5p: "H5P",
  lti: "外部ツール",
  bigBlueButton: "オンライン授業",
  grades: "成績",
  people: "参加者",
  profile: "プロフィール",
  privateFiles: "プライベートファイル",
  badges: "バッジ",
  plans: "学習プラン",
  messages: "メッセージ",
  contacts: "連絡先",
  notifications: "通知",
  notificationPreferences: "通知設定",
  calendar: "カレンダー",
  calendarManage: "予定の管理",
};

/**
 * A non-sensitive student-facing inventory for diagnostics and fixtures. It
 * contains only component identifiers and delivery decisions, never functions
 * or credentials from the Moodle session.
 */
export function studentSupportCatalog(
  manifest: MoodleCapabilityManifest,
): readonly StudentSupportCatalogEntry[] {
  const features = (Object.keys(FEATURE_LABELS) as StudentFeatureKey[]).map((key) => ({
    delivery: featureDeliveryFor(manifest, key),
    id: key,
    kind: "feature" as const,
    label: FEATURE_LABELS[key],
    state: manifest.features[key],
  }));
  const activities = ACTIVITY_MODULE_NAMES.map((moduleName) => ({
    delivery: activityDeliveryFor(manifest, moduleName),
    id: moduleName,
    kind: "activity" as const,
    label: moduleName,
    state: manifest.activitySupport[moduleName],
  }));
  return [...features, ...activities].sort((left, right) =>
    left.label.localeCompare(right.label, "ja"),
  );
}
