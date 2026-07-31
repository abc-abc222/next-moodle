import { describe, expect, test } from "bun:test";

import { projectAssignmentHtmlScreen } from "@/lib/moodle/activities/assignment-html-view";
import { moodleDocumentText } from "@/lib/moodle/html";
import { parseMoodlePage } from "@/lib/moodle/page-parser";

describe("assignment HTML view projection", () => {
  test("separates an assignment brief, schedule, and submission-status table", () => {
    const screen = parseMoodlePage(`
      <main><h1>Practice answer</h1><h2>Practice answer</h2><div>完了要件<strong>開始:</strong> 2026-07-28 10:40<strong>期限:</strong> 2026-08-03 23:59</div>
      <p>Use this space when the answer is not in the word bank.</p><h3>提出ステータス</h3><table><tbody><tr><th>提出ステータス</th><td>まだ提出されていません。</td></tr><tr><th>残り時間</th><td>残り 2 日</td></tr></tbody></table></main>
    `, { currentUrl: new URL("https://moodle.example.test/mod/assign/view.php?id=25544"), siteUrl: "https://moodle.example.test" }).screen;
    const view = projectAssignmentHtmlScreen(screen);

    expect(view.schedule).toEqual([
      { label: "開始", value: "2026-07-28 10:40" },
      { label: "期限", value: "2026-08-03 23:59" },
    ]);
    expect(view.status).toEqual([
      { label: "提出ステータス", value: "まだ提出されていません。" },
      { label: "残り時間", value: "残り 2 日" },
    ]);
    expect(moodleDocumentText(view.description)).toContain("Use this space");
    expect(moodleDocumentText(view.description)).not.toContain("提出ステータス");
    expect(moodleDocumentText(view.description)).not.toContain("2026-08-03");
  });
});
