import type {
  ActivityModuleName,
  CapabilityDelivery,
  MoodleCapabilityManifest,
} from "../capabilities";
import { ActivityModuleNameSchema, activityDeliveryFor, pluginDeliveryFor } from "../capabilities";
import type { StudentFeatureKey } from "../capabilities";
import {
  OfficialActivityAdapterSchema,
  type OfficialActivityAdapter,
} from "./contracts";

const ADAPTER_DEFINITIONS = [
  { moduleName: "assign", label: "課題", operations: ["read", "viewEvent", "save", "submit", "review"], workspace: "submission" },
  { moduleName: "quiz", label: "小テスト", operations: ["read", "viewEvent", "start", "save", "submit", "review"], workspace: "assessment" },
  { moduleName: "forum", label: "フォーラム", operations: ["read", "viewEvent", "reply", "subscribe"], workspace: "discussion" },
  { moduleName: "choice", label: "投票", operations: ["read", "viewEvent", "submit"], workspace: "form" },
  { moduleName: "feedback", label: "フィードバック", operations: ["read", "viewEvent", "save", "submit"], workspace: "form" },
  { moduleName: "lesson", label: "レッスン", operations: ["read", "viewEvent", "start", "save", "submit"], workspace: "assessment" },
  { moduleName: "glossary", label: "用語集", operations: ["read", "viewEvent", "save"], workspace: "document" },
  { moduleName: "wiki", label: "Wiki", operations: ["read", "viewEvent", "save"], workspace: "document" },
  { moduleName: "data", label: "データベース", operations: ["read", "viewEvent", "save"], workspace: "form" },
  { moduleName: "workshop", label: "ワークショップ", operations: ["read", "viewEvent", "save", "submit", "review"], workspace: "submission" },
  { moduleName: "scorm", label: "SCORM", operations: ["read", "viewEvent", "launch"], workspace: "launch" },
  { moduleName: "h5pactivity", label: "H5P", operations: ["read", "viewEvent", "launch"], workspace: "launch" },
  { moduleName: "lti", label: "外部ツール", operations: ["read", "viewEvent", "launch"], workspace: "launch" },
  { moduleName: "bigbluebuttonbn", label: "オンライン授業", operations: ["read", "viewEvent", "launch"], workspace: "launch" },
  { moduleName: "book", label: "ブック", operations: ["read", "viewEvent", "complete"], workspace: "document" },
  { moduleName: "resource", label: "ファイル", operations: ["read", "viewEvent", "complete"], workspace: "document" },
  { moduleName: "folder", label: "フォルダー", operations: ["read", "viewEvent", "complete"], workspace: "document" },
  { moduleName: "imscp", label: "IMSパッケージ", operations: ["read", "viewEvent", "complete"], workspace: "document" },
  { moduleName: "page", label: "ページ", operations: ["read", "viewEvent", "complete"], workspace: "document" },
  { moduleName: "url", label: "URL", operations: ["read", "viewEvent", "launch", "complete"], workspace: "launch" },
] as const;

const FEATURE_BY_MODULE = {
  assign: "assignmentsRead", quiz: "quizzes", forum: "forums", choice: "choice",
  feedback: "feedback", lesson: "lesson", glossary: "glossary", wiki: "wiki",
  data: "database", workshop: "workshop", scorm: "scorm", h5pactivity: "h5p",
  lti: "lti", bigbluebuttonbn: "bigBlueButton", book: "resources",
  resource: "resources", folder: "resources", imscp: "resources", page: "resources",
  url: "resources",
} as const satisfies Record<ActivityModuleName, StudentFeatureKey>;

const OFFICIAL_ADAPTERS = new Map<ActivityModuleName, OfficialActivityAdapter>(
  ADAPTER_DEFINITIONS.map((definition) => {
    const parsed = OfficialActivityAdapterSchema.parse(definition);
    return [parsed.moduleName, parsed];
  }),
);

export type ActivityAdapterResolution =
  | Readonly<{ kind: "native"; adapter: OfficialActivityAdapter }>
  | Readonly<{ kind: "adapter_required"; moduleName: string }>
  | Readonly<{ kind: "unavailable"; feature: StudentFeatureKey; moduleName: ActivityModuleName }>;

export function resolveActivityAdapter(
  moduleName: string,
  manifest: MoodleCapabilityManifest,
): ActivityAdapterResolution {
  const parsedModule = ActivityModuleNameSchema.safeParse(moduleName);
  if (!parsedModule.success) {
    return { kind: "adapter_required", moduleName };
  }
  const feature = FEATURE_BY_MODULE[parsedModule.data];
  const state = manifest.activityAdapters[parsedModule.data];
  if (state === "adapter_required") {
    return { kind: "adapter_required", moduleName: parsedModule.data };
  }
  if (state === "unavailable") {
    return { kind: "unavailable", feature, moduleName: parsedModule.data };
  }
  const adapter = OFFICIAL_ADAPTERS.get(parsedModule.data);
  if (adapter === undefined) {
    return { kind: "unavailable", feature, moduleName: parsedModule.data };
  }
  return { kind: "native", adapter };
}

/**
 * Unknown activities never receive an optimistic native default. A companion
 * must explicitly register them before the student workspace can offer a
 * typed adapter or isolated runtime.
 */
export function resolveActivityDelivery(
  moduleName: string,
  manifest: MoodleCapabilityManifest,
): CapabilityDelivery {
  const parsedModule = ActivityModuleNameSchema.safeParse(moduleName);
  if (parsedModule.success) return activityDeliveryFor(manifest, parsedModule.data);
  return pluginDeliveryFor(manifest, moduleName);
}
