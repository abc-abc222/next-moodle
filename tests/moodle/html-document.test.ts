import { describe, expect, test } from "bun:test";

import {
  moodleDocumentControlNames,
  moodleDocumentFromHtml,
  moodleQuizDocumentFromHtml,
  moodleDocumentText,
} from "@/lib/moodle/html";
import { safeMoodleUrl } from "@/lib/moodle/queries/courses-model";

const SITE_URL = "https://moodle.example.test/moodle";

describe("Moodle HTML document pipeline", () => {
  test("sanitizes and turns rich Moodle HTML into serializable document nodes", () => {
    const document = moodleDocumentFromHtml([
      '<h2>Week <em>one</em></h2>',
      '<p><a href="/moodle/mod/page/view.php?id=31">Read</a><script>alert(1)</script></p>',
      '<table><thead><tr><th scope="col">Name</th></tr></thead><tbody><tr><td>Value</td></tr></tbody></table>',
      '<figure><img src="javascript:alert(1)" alt="blocked"></figure>',
    ].join(""), { siteUrl: SITE_URL });

    expect(document.kind).toBe("document");
    expect(JSON.stringify(document)).not.toContain("script");
    expect(JSON.stringify(document)).not.toContain("javascript:");
    expect(JSON.stringify(document)).toContain("/activities/31");
    expect(moodleDocumentText(document)).toContain("Week one");
    expect(moodleDocumentText(document)).toContain("Value");
  });

  test("normalizes Moodle table captions, whitespace, and loose rows into a valid table tree", () => {
    const document = moodleDocumentFromHtml(`
      <table>
        <caption>Submission status</caption>
        \n
        <tr>\n<th>Status</th>\n<td>Not submitted</td>\n</tr>
        <tbody>\n<tr>\n<td>Draft</td>\n</tr>\n</tbody>
      </table>
    `, { siteUrl: SITE_URL });
    const table = document.nodes.find((node) => node.kind === "table");

    expect(table?.kind).toBe("table");
    if (table?.kind !== "table") throw new Error("table fixture was not parsed");
    expect(table.children.every((node) => node.kind === "tableHead" || node.kind === "tableBody")).toBe(true);
    for (const section of table.children) {
      if (section.kind !== "tableHead" && section.kind !== "tableBody") continue;
      expect(section.children.every((node) => node.kind === "tableRow")).toBe(true);
      for (const row of section.children) {
        if (row.kind !== "tableRow") continue;
        expect(row.children.every((node) => node.kind === "tableCell")).toBe(true);
      }
    }
    expect(moodleDocumentText(document)).toContain("Not submitted");
    expect(moodleDocumentText(document)).toContain("Draft");
  });

  test("retains only local quiz controls after sanitizing their source HTML", () => {
    const document = moodleQuizDocumentFromHtml([
      '<input name="answer" type="text" value="">',
      '<input name="bad value" type="text">',
      '<button onclick="alert(1)">Danger</button>',
      '<input type="submit" value="選択をクリア">',
    ].join(""), { siteUrl: SITE_URL });

    expect(moodleDocumentControlNames(document)).toEqual(["answer", "bad value"]);
    expect(JSON.stringify(document)).toContain('"action":"clear"');
    expect(JSON.stringify(document)).not.toContain("onclick");
  });

  test("decodes Moodle rich-editor values before rendering the quiz editor", () => {
    const document = moodleQuizDocumentFromHtml(
      '<textarea name="answer">&amp;lt;p&amp;gt;&amp;amp;lt;strong&amp;amp;gt;【解答】&amp;amp;lt;/strong&amp;amp;gt;&amp;lt;br&amp;gt;①&amp;lt;/p&amp;gt;&amp;lt;script&amp;gt;alert(1)&amp;lt;/script&amp;gt;</textarea>',
      { siteUrl: SITE_URL },
    );
    const textarea = document.nodes.find((node) => node.kind === "textarea");

    expect(textarea?.kind).toBe("textarea");
    if (textarea?.kind !== "textarea") throw new Error("textarea fixture was not parsed");
    expect(textarea.value).toBe("<p><strong>【解答】</strong><br />①</p>");
    expect(textarea.value).not.toContain("script");
  });

  test("allows only a same-origin Moodle activity URL with one id parameter", () => {
    expect(safeMoodleUrl("https://moodle.example.test/moodle/mod/questionnaire/view.php?id=42", SITE_URL)).toBe("https://moodle.example.test/moodle/mod/questionnaire/view.php?id=42");
    expect(safeMoodleUrl("https://moodle.example.test/moodle/mod/questionnaire/view.php?id=42&next=%2F", SITE_URL)).toBeNull();
    expect(safeMoodleUrl("https://moodle.example.test/moodle/course/view.php?id=42", SITE_URL)).toBeNull();
    expect(safeMoodleUrl("https://other.example.test/moodle/mod/questionnaire/view.php?id=42", SITE_URL)).toBeNull();
  });
});
