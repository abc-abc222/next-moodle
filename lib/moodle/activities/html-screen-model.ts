import type { MoodleScreenModel } from "../page-model";

export type QuestionnaireReportItem = Readonly<{
  answers: readonly string[];
  number: string;
  prompt: string;
}>;

export type AttendanceScreenSummary = Readonly<{
  codeControlId: string | null;
  currentStatus: "absent" | "late" | "present" | "unknown";
  records: readonly Readonly<{ date: string; status: string }>[];
}>;

export type PublicHtmlActivityScreen =
  | Readonly<{ kind: "generic"; moduleName: string; screen: MoodleScreenModel }>
  | Readonly<{ attendance: AttendanceScreenSummary; kind: "attendance"; screen: MoodleScreenModel }>
  | Readonly<{
    kind: "questionnaire";
    mode: "closed" | "report" | "respond" | "summary";
    report: readonly QuestionnaireReportItem[];
    screen: MoodleScreenModel;
    submittedAt: string | null;
  }>;
