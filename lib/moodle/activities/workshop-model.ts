import { moodleDocumentFromHtml, type MoodleDocument } from "@/lib/moodle/html";

export type WorkshopPhase = Readonly<{
  key: "closed" | "evaluation" | "setup" | "submission" | "assessment" | "unknown";
  label: string;
}>;

export type WorkshopSubmissionWire = Readonly<{
  content: string | null;
  id: number;
  timecreated: number;
  timemodified: number;
  title: string;
}>;

export type WorkshopActivityData = Readonly<{
  canCreate: boolean;
  canModify: boolean;
  id: number;
  instructions: MoodleDocument;
  name: string;
  phase: WorkshopPhase;
  submissions: readonly Readonly<{
    content: MoodleDocument;
    id: number;
    timeCreated: number;
    timeModified: number;
    title: string;
  }>[];
}>;

export function workshopSubmissionQuery(workshopId: number, userId: number) {
  return {
    groupid: 0,
    page: 0,
    perpage: 100,
    userid: userId,
    workshopid: workshopId,
  } as const;
}

export function projectWorkshopPhase(value: number): WorkshopPhase {
  if (value === 10) return { key: "setup", label: "準備フェーズ" };
  if (value === 20) return { key: "submission", label: "提出フェーズ" };
  if (value === 30) return { key: "assessment", label: "相互評価フェーズ" };
  if (value === 40) return { key: "closed", label: "終了" };
  if (value === 50) return { key: "evaluation", label: "成績計算フェーズ" };
  return { key: "unknown", label: "状態を確認中" };
}

export function projectWorkshopActivity(input: Readonly<{
  canCreate: boolean;
  canModify: boolean;
  id: number;
  instructions: string;
  name: string;
  phase: number;
  siteUrl: string;
  submissions: readonly WorkshopSubmissionWire[];
}>): WorkshopActivityData {
  return {
    canCreate: input.canCreate,
    canModify: input.canModify,
    id: input.id,
    instructions: moodleDocumentFromHtml(input.instructions, { siteUrl: input.siteUrl }),
    name: input.name,
    phase: projectWorkshopPhase(input.phase),
    submissions: input.submissions.map((submission) => ({
      content: moodleDocumentFromHtml(submission.content ?? "", { siteUrl: input.siteUrl }),
      id: submission.id,
      timeCreated: submission.timecreated,
      timeModified: submission.timemodified,
      title: submission.title,
    })),
  };
}
