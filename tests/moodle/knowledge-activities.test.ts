import { describe, expect, test } from "bun:test";

import {
  projectGlossaryActivity,
  type GlossaryEntryWire,
} from "@/lib/moodle/activities/glossary-model";
import {
  projectWikiActivity,
  type WikiPageWire,
} from "@/lib/moodle/activities/wiki-model";
import { projectFeedbackItems } from "@/lib/moodle/activities/feedback-model";
import { extractLessonResponseNames } from "@/lib/moodle/activities/lesson-model";
import { moodleQuizDocumentFromHtml } from "@/lib/moodle/html";
import {
  encodeDatabaseFieldValue,
  projectDatabaseFields,
} from "@/lib/moodle/activities/database-model";
import {
  projectWorkshopPhase,
  workshopSubmissionQuery,
} from "@/lib/moodle/activities/workshop-model";

describe("knowledge activities", () => {
  test("sanitizes glossary definitions and preserves write capability", () => {
    const entries: GlossaryEntryWire[] = [{
      approved: true,
      concept: "Transect",
      definition: '<p>A fixed survey line.</p><script>alert(1)</script>',
      id: 1,
      timecreated: 100,
      timemodified: 200,
      userfullname: "Fixture Learner",
    }];
    const projected = projectGlossaryActivity({
      canAdd: true,
      entries,
      id: 9,
      name: "Field terms",
      siteUrl: "https://moodle.synthetic.invalid",
      total: 1,
    });
    expect(projected.canAdd).toBe(true);
    expect(JSON.stringify(projected.entries[0]?.definition)).not.toContain("script");
  });

  test("sanitizes wiki content and keeps only editable page metadata", () => {
    const pages: WikiPageWire[] = [{
      cachedcontent: '<h2>Protocol</h2><img src="javascript:alert(1)">',
      caneditpage: true,
      id: 4,
      readonly: 0,
      subwikiid: 2,
      timecreated: 100,
      timemodified: 200,
      title: "Protocol",
    }];
    const projected = projectWikiActivity({
      id: 8,
      name: "Lab wiki",
      pages,
      siteUrl: "https://moodle.synthetic.invalid",
    });
    expect(projected.pages[0]?.canEdit).toBe(true);
    expect(JSON.stringify(projected.pages[0]?.content)).not.toContain("javascript:");
  });

  test("projects Moodle feedback item names and bounded choices", () => {
    const items = projectFeedbackItems([{
      hasvalue: 1,
      id: 12,
      name: "Choose a site",
      presentation: "r>>>>>Rocky shore|Tidal marsh",
      required: true,
      typ: "multichoice",
    }]);
    expect(items[0]?.responseName).toBe("multichoice_12");
    expect(items[0]?.options).toEqual(["Rocky shore", "Tidal marsh"]);
  });

  test("extracts only bounded response names from sanitized lesson controls", () => {
    const names = extractLessonResponseNames(moodleQuizDocumentFromHtml('<input name="answer"><textarea name="answer[text]"></textarea><input name="bad value">', { siteUrl: "https://moodle.example.test" }));
    expect(names).toEqual(["answer", "answer[text]"]);
  });

  test("projects only supported database fields and encodes Moodle values", () => {
    const fields = projectDatabaseFields([
      { description: "Short label", id: 1, name: "Label", param1: null, required: true, type: "text" },
      { description: "Select one", id: 2, name: "Zone", param1: "Coast\nForest", required: false, type: "menu" },
      { description: "Upload", id: 3, name: "Photo", param1: null, required: false, type: "file" },
    ]);
    expect(fields.map((field) => field.kind)).toEqual(["text", "select", "unsupported"]);
    expect(fields[1]?.options).toEqual(["Coast", "Forest"]);
    expect(encodeDatabaseFieldValue(fields[0]!, "Transect A")).toBe('"Transect A"');
  });

  test("normalizes workshop phases without trusting labels from the wire", () => {
    expect(projectWorkshopPhase(20)).toEqual({ key: "submission", label: "提出フェーズ" });
    expect(projectWorkshopPhase(40)).toEqual({ key: "closed", label: "終了" });
    expect(projectWorkshopPhase(999)).toEqual({ key: "unknown", label: "状態を確認中" });
  });

  test("scopes workshop submissions to the authenticated learner", () => {
    expect(workshopSubmissionQuery(44, 812)).toMatchObject({
      userid: 812,
      workshopid: 44,
    });
  });

});
