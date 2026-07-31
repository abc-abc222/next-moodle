import type { ActivityModuleName, CapabilityDelivery, MoodleCapabilityManifest } from "../capabilities";
import { ActivityModuleNameSchema, activityDeliveryFor, unknownActivityDelivery } from "../capabilities";
import { OfficialActivityDefinitionSchema, type OfficialActivityDefinition } from "./contracts";

const definitions = [
  { moduleName: "assign", label: "課題", operations: ["read", "viewEvent", "save", "submit", "review"], workspace: "submission" }, { moduleName: "quiz", label: "小テスト", operations: ["read", "viewEvent", "start", "save", "submit", "review"], workspace: "assessment" }, { moduleName: "forum", label: "フォーラム", operations: ["read", "viewEvent", "reply", "subscribe"], workspace: "discussion" }, { moduleName: "choice", label: "投票", operations: ["read", "viewEvent", "submit"], workspace: "form" }, { moduleName: "feedback", label: "フィードバック", operations: ["read", "viewEvent", "save", "submit"], workspace: "form" }, { moduleName: "lesson", label: "レッスン", operations: ["read", "viewEvent", "start", "save", "submit"], workspace: "assessment" }, { moduleName: "glossary", label: "用語集", operations: ["read", "viewEvent", "save"], workspace: "document" }, { moduleName: "wiki", label: "Wiki", operations: ["read", "viewEvent", "save"], workspace: "document" }, { moduleName: "data", label: "データベース", operations: ["read", "viewEvent", "save"], workspace: "form" }, { moduleName: "workshop", label: "ワークショップ", operations: ["read", "viewEvent", "save", "submit", "review"], workspace: "submission" }, { moduleName: "scorm", label: "SCORM", operations: ["read", "viewEvent", "launch"], workspace: "launch" }, { moduleName: "h5pactivity", label: "H5P", operations: ["read", "viewEvent", "launch"], workspace: "launch" }, { moduleName: "lti", label: "外部ツール", operations: ["read", "viewEvent", "launch"], workspace: "launch" }, { moduleName: "bigbluebuttonbn", label: "オンライン授業", operations: ["read", "viewEvent", "launch"], workspace: "launch" }, { moduleName: "book", label: "ブック", operations: ["read", "viewEvent", "complete"], workspace: "document" }, { moduleName: "resource", label: "ファイル", operations: ["read", "viewEvent", "complete"], workspace: "document" }, { moduleName: "folder", label: "フォルダー", operations: ["read", "viewEvent", "complete"], workspace: "document" }, { moduleName: "imscp", label: "IMSパッケージ", operations: ["read", "viewEvent", "complete"], workspace: "document" }, { moduleName: "page", label: "ページ", operations: ["read", "viewEvent", "complete"], workspace: "document" }, { moduleName: "url", label: "URL", operations: ["read", "viewEvent", "launch", "complete"], workspace: "launch" },
] as const;

const official = new Map<ActivityModuleName, OfficialActivityDefinition>(definitions.map((definition) => {
  const parsed = OfficialActivityDefinitionSchema.parse(definition);
  return [parsed.moduleName, parsed];
}));

export type ActivityResolution =
  | Readonly<{ kind: "api"; definition: OfficialActivityDefinition }>
  | Readonly<{ kind: "html"; moduleName: string }>

export function resolveActivity(moduleName: string, manifest: MoodleCapabilityManifest): ActivityResolution {
  const parsed = ActivityModuleNameSchema.safeParse(moduleName);
  if (!parsed.success) return { kind: "html", moduleName };
  if (["scorm", "h5pactivity", "lti", "bigbluebuttonbn", "url"].includes(parsed.data)) return { kind: "html", moduleName };
  if (manifest.activitySupport[parsed.data] === "unavailable") return { kind: "html", moduleName };
  const activity = official.get(parsed.data);
  return activity === undefined ? { kind: "html", moduleName } : { kind: "api", definition: activity };
}

export function resolveActivityDelivery(moduleName: string, manifest: MoodleCapabilityManifest): CapabilityDelivery {
  const parsed = ActivityModuleNameSchema.safeParse(moduleName);
  return parsed.success ? activityDeliveryFor(manifest, parsed.data) : unknownActivityDelivery();
}
