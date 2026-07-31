import { moodleDocumentControlNames, type MoodleDocument } from "@/lib/moodle/html";

export type LessonActivityData = Readonly<{
  completed: boolean;
  content: MoodleDocument;
  id: number;
  name: string;
  pageId: number | null;
  progress: number | null;
}>;

export function extractLessonResponseNames(document: MoodleDocument): readonly string[] {
  return moodleDocumentControlNames(document).filter((name) => /^[a-z][a-z0-9_\[\]-]{0,79}$/i.test(name));
}
