import type { ChoiceActivityData } from "./choice";
import type { DatabaseActivityData } from "./database-model";
import type { FeedbackActivityData } from "./feedback-model";
import type { ForumActivityData } from "./forum";
import type { GlossaryActivityData } from "./glossary-model";
import type { LessonActivityData } from "./lesson-model";
import type { QuizActivityData } from "./quiz";
import type { WikiActivityData } from "./wiki-model";
import type { WorkshopActivityData } from "./workshop-model";

export type NativeActivityData =
  | Readonly<{ kind: "choice"; data: ChoiceActivityData }>
  | Readonly<{ kind: "database"; data: DatabaseActivityData }>
  | Readonly<{ kind: "feedback"; data: FeedbackActivityData }>
  | Readonly<{ kind: "forum"; data: ForumActivityData }>
  | Readonly<{ kind: "glossary"; data: GlossaryActivityData }>
  | Readonly<{ kind: "lesson"; data: LessonActivityData }>
  | Readonly<{ kind: "quiz"; data: QuizActivityData }>
  | Readonly<{ kind: "wiki"; data: WikiActivityData }>
  | Readonly<{ kind: "workshop"; data: WorkshopActivityData }>;
