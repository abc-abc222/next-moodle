import { describe, expect, test } from "bun:test";

import { parseQuestionnaireReport } from "@/lib/moodle/activities/questionnaire-report";
import { materializeMoodleFormSubmission, parseMoodlePage } from "@/lib/moodle/page-parser";

const SITE = "https://moodle.example.edu";

const QUESTIONNAIRE_HTML = `<!doctype html><html><head><title>Survey</title></head><body><main>
  <h1>Student questionnaire</h1>
  <form method="post" action="${SITE}/mod/questionnaire/complete.php?id=44">
    <input type="hidden" name="sesskey" value="secret-session-key">
    <input type="hidden" name="rid" value="731">
    <fieldset id="qn-11"><legend>Question 1 Short response</legend><div class="accesshide">Required</div><label for="text11">Short response</label><input id="text11" name="q11" maxlength="20" type="text" value="draft"></fieldset>
    <fieldset id="qn-12"><legend>Question 2 Longer response</legend><label for="q12">Longer response</label><textarea id="q12" name="q12">essay</textarea></fieldset>
    <fieldset id="qn-13"><legend>Question 3 Number</legend><label for="numerical13">Number</label><input id="numerical13" name="q13" type="text" value="7"></fieldset>
    <fieldset id="qn-14"><legend>Question 4 Date</legend><label for="date14">Date</label><input id="date14" name="q14" type="date" value="2026-07-31"></fieldset>
    <fieldset id="qn-15"><legend>Question 5 Yes or no</legend><input id="yes15" name="q15" type="radio" value="y"><label for="yes15">Yes</label><input id="no15" name="q15" type="radio" value="n"><label for="no15">No</label></fieldset>
    <fieldset id="qn-16"><legend>Question 6 Multiple choice</legend><input id="c161" name="q16[101]" type="checkbox" value="101" checked><label for="c161">Alpha</label><input id="c162" name="q16[102]" type="checkbox" value="102"><label for="c162">Beta</label></fieldset>
    <fieldset id="qn-17"><legend>Question 7 Select</legend><label for="drop17">Select</label><select id="drop17" name="q17"><option value="0">Choose</option><option selected value="7">Seven</option></select></fieldset>
    <fieldset id="qn-18"><legend>Question 8 Matrix</legend><table><tbody><tr><th>Quality</th><td><input id="r1811" name="q18_201" type="radio" value="1"><label class="accesshide" for="r1811">Quality Low</label></td><td><input id="r1815" name="q18_201" type="radio" value="5"><label class="accesshide" for="r1815">Quality High</label></td></tr><tr><th>Speed</th><td><input id="r1821" name="q18_202" type="radio" value="1"><label class="accesshide" for="r1821">Speed Low</label></td><td><input id="r1825" name="q18_202" type="radio" value="5"><label class="accesshide" for="r1825">Speed High</label></td></tr></tbody></table></fieldset>
    <fieldset id="qn-19"><legend>Question 9 Scale</legend><label for="slider19">Scale</label><input id="slider19" name="q19" type="range" min="1" max="10" step="1" value="5"></fieldset>
    <input name="prev" type="submit" value="Previous page">
    <input name="resume" type="submit" value="Save and exit">
    <input name="submit" type="submit" value="Submit survey">
    <input name="submittype" type="hidden" value="Submit Survey">
  </form>
  <script>window.steal = document.cookie</script>
</main></body></html>`;

const SUBMITTED_REPORT_HTML = `<!doctype html><html><body><main>
  <h2>あなたの回答を表示する</h2>
  <strong>匿名 学生</strong>
  <p>提出完了: 2026年 04月 21日(火曜日) 10:55</p>
  <h3>コンピュータシステム入門</h3>
  <fieldset><legend>質問 #1 世界最初のワンチップCPUはどれですか？</legend><h2>1</h2><p>世界最初のワンチップCPUはどれですか？</p><label for="answer-1">Intel 4004</label><input checked disabled id="answer-1" type="radio" value="4004"><label for="answer-2">Intel 8086</label><input disabled id="answer-2" type="radio" value="8086"></fieldset>
  <fieldset><legend>質問 #2 自由記述</legend><h2>2</h2><p>連絡事項</p><textarea disabled>確認しました。</textarea></fieldset>
</main></body></html>`;

describe("Questionnaire authenticated HTML contract", () => {
  test("projects every Moodle 4.x question shape into semantic controls", () => {
    const projection = parseMoodlePage(QUESTIONNAIRE_HTML, { currentUrl: new URL(`${SITE}/mod/questionnaire/complete.php?id=44`), siteUrl: SITE });
    const form = projection.screen.forms[0];
    expect(form).toBeDefined();
    expect(form?.controls.map((control) => control.kind)).toEqual([
      "text", "textarea", "number", "date", "radio", "checkboxes", "select", "radio", "radio", "range",
    ]);
    expect(form?.controls[0]?.required).toBe(true);
    expect(form?.controls[5]?.kind).toBe("checkboxes");
    expect(form?.actions.map((action) => action.purpose)).toEqual(["previous", "save", "submit"]);
    const serialized = JSON.stringify(projection.screen);
    expect(serialized).not.toContain("secret-session-key");
    expect(serialized).not.toContain('"q16[101]"');
    expect(serialized).not.toContain("submittype");
    expect(serialized).not.toContain("window.steal");
  });

  test("maps semantic matrix and checkbox answers to the fresh Moodle field names", () => {
    const projection = parseMoodlePage(QUESTIONNAIRE_HTML, { currentUrl: new URL(`${SITE}/mod/questionnaire/complete.php?id=44`), siteUrl: SITE });
    const form = projection.screen.forms[0];
    if (form === undefined) throw new Error("fixture form missing");
    const checkbox = form.controls.find((control) => control.kind === "checkboxes");
    const rows = form.controls.filter((control) => control.kind === "radio" && control.label.includes("Matrix"));
    const action = form.actions.find((candidate) => candidate.purpose === "submit");
    if (checkbox?.kind !== "checkboxes" || rows.length !== 2 || action === undefined) throw new Error("fixture controls missing");
    const values = Object.fromEntries(form.controls.map((control) => {
      if (control.id === checkbox.id) return [control.id, checkbox.options.map((option) => option.id)];
      const row = rows.find((candidate) => candidate.id === control.id);
      if (row?.kind === "radio") return [control.id, [row.options.at(-1)?.id ?? ""]];
      if ("value" in control) return [control.id, control.value];
      if ("selected" in control) return [control.id, control.selected];
      return [control.id, control.checked];
    }));
    const result = materializeMoodleFormSubmission(projection, { actionId: action.id, formId: form.id, revision: form.revision, values });
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.body.get("sesskey")).toBe("secret-session-key");
    expect(result.body.get("q16[101]")).toBe("101");
    expect(result.body.get("q16[102]")).toBe("102");
    expect(result.body.get("q18_201")).toBe("5");
    expect(result.body.get("q18_202")).toBe("5");
    expect(result.body.get("submit")).toBe("Submit survey");
  });

  test("reads an anonymized submitted-report structure without exposing the respondent", () => {
    const report = parseQuestionnaireReport(SUBMITTED_REPORT_HTML, SITE);

    expect(report.submittedAt).toBe("2026年 04月 21日(火曜日) 10:55");
    expect(report.items).toEqual([
      { answers: ["Intel 4004"], number: "1", prompt: "世界最初のワンチップCPUはどれですか？" },
      { answers: ["確認しました。"], number: "2", prompt: "連絡事項" },
    ]);
    expect(JSON.stringify(report)).not.toContain("匿名 学生");
  });
});
