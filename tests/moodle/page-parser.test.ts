import { describe, expect, test } from "bun:test";

import { moodleDocumentText } from "../../lib/moodle/html";
import { GenericMoodleFormSubmissionSchema } from "../../lib/moodle/page-model";
import { materializeMoodleFormSubmission, parseMoodlePage } from "../../lib/moodle/page-parser";

const SITE_URL = "https://moodle.example.test";
const CURRENT_URL = new URL(`${SITE_URL}/mod/questionnaire/complete.php?id=42`);

describe("authenticated Moodle page parser", () => {
  test("removes executable markup and never exposes hidden values or field names", () => {
    const projection = parseMoodlePage(`
      <script>window.steal = document.cookie</script>
      <main><h1>Survey</h1><form action="/mod/questionnaire/complete.php?id=42" method="post">
        <input name="sesskey" type="hidden" value="private-csrf">
        <fieldset><legend>Question</legend><label for="secret-name">Answer</label><input id="secret-name" name="q_128_private" required value="draft"></fieldset>
        <button name="submitbutton" type="submit" value="1">Submit</button>
      </form></main>
    `, { currentUrl: CURRENT_URL, siteUrl: SITE_URL });

    expect(projection.screen.title).toBe("Survey");
    expect(projection.screen.forms).toHaveLength(1);
    expect(JSON.stringify(projection.screen)).not.toContain("sesskey");
    expect(JSON.stringify(projection.screen)).not.toContain("private-csrf");
    expect(JSON.stringify(projection.screen)).not.toContain("q_128_private");
    expect(JSON.stringify(projection.screen)).not.toContain("window.steal");
  });

  test("re-materializes only semantic control and option ids against the latest form", () => {
    const projection = parseMoodlePage(`<main><h1>Survey</h1><form action="/mod/questionnaire/complete.php?id=42" method="post"><input name="sesskey" type="hidden" value="fresh"><fieldset><legend>Choice</legend><label for="yes">Yes</label><input id="yes" name="question_1" required type="radio" value="raw-yes"><label for="no">No</label><input id="no" name="question_1" type="radio" value="raw-no"></fieldset><button name="submit" type="submit" value="go">Send</button></form></main>`, { currentUrl: CURRENT_URL, siteUrl: SITE_URL });
    const form = projection.screen.forms[0];
    const control = form?.controls[0];
    const action = form?.actions[0];
    if (form === undefined || control === undefined || action === undefined || !("options" in control)) throw new Error("fixture form missing");
    const submission = GenericMoodleFormSubmissionSchema.parse({ actionId: action.id, formId: form.id, revision: form.revision, values: { [control.id]: [control.options[0]?.id] } });
    const materialized = materializeMoodleFormSubmission(projection, submission);

    expect(materialized.kind).toBe("ready");
    if (materialized.kind !== "ready") throw new Error("not ready");
    expect(materialized.body.get("sesskey")).toBe("fresh");
    expect(materialized.body.get("question_1")).toBe("raw-yes");
    expect(materialized.body.get("submit")).toBe("go");
  });

  test("drops cross-origin forms instead of retargeting them locally", () => {
    const projection = parseMoodlePage('<main><h1>Unsafe</h1><form action="https://evil.example/collect" method="post"><input name="answer"><button type="submit">Send</button></form></main>', { currentUrl: CURRENT_URL, siteUrl: SITE_URL });
    expect(projection.screen.forms).toHaveLength(0);
  });

  test("uses Moodle's region-main landmark instead of the navigation and message drawer", () => {
    const projection = parseMoodlePage(`
      <html><head><title>7/21課題 | SIT-Moodle2026</title></head><body>
        <nav>メインコンテンツへスキップする SIT-Moodle2026 Home ダッシュボード マイコース</nav>
        <aside>メッセージング コンタクト 人およびメッセージを検索する コンタクトリクエストが送信されました。</aside>
        <div id="region-main">
          <h1>7/21課題</h1>
          <div class="alert alert-warning">アンケートは終了しました。ありがとうございます。</div>
          <p>提出済みの回答を確認できます。</p>
          <form action="/mod/questionnaire/complete.php?id=42" method="post"><input name="sesskey" type="hidden" value="private-csrf"><label for="answer">回答</label><input id="answer" name="q_42" value=""><button name="submit" type="submit" value="1">保存</button></form>
        </div>
      </body></html>
    `, { currentUrl: CURRENT_URL, siteUrl: SITE_URL });

    expect(projection.screen.title).toBe("7/21課題");
    expect(moodleDocumentText(projection.screen.document)).toContain("提出済みの回答を確認できます。");
    expect(moodleDocumentText(projection.screen.document)).not.toContain("人およびメッセージを検索する");
    expect(JSON.stringify(projection.screen)).not.toContain("private-csrf");
    expect(projection.screen.forms).toHaveLength(1);
  });

  test("keeps a URL activity's safe external resource as an inert outbound document link", () => {
    const projection = parseMoodlePage(`
      <nav>サイトナビゲーション</nav>
      <div id="region-main"><h1>授業ビデオのリンク先</h1><p>リソースを開くには <a href="https://drive.google.com/file/d/example/view?usp=sharing">授業ビデオのリンク先</a> をクリックしてください。</p></div>
    `, { currentUrl: new URL(`${SITE_URL}/mod/url/view.php?id=26475`), siteUrl: SITE_URL });

    expect(projection.screen.title).toBe("授業ビデオのリンク先");
    expect(moodleDocumentText(projection.screen.document)).toContain("リソースを開くには");
    expect(JSON.stringify(projection.screen.document)).toContain("https://drive.google.com/file/d/example/view?usp=sharing");
    expect(JSON.stringify(projection.screen.document)).toContain('"external":true');
  });

  test("keeps an assignment submission action and excludes rich editor toolbar buttons", () => {
    const projection = parseMoodlePage(`
      <h1>予備解答欄２</h1>
      <div id="region-main">
        <form action="/mod/assign/view.php" method="post">
          <input name="id" type="hidden" value="25544"><input name="sesskey" type="hidden" value="private-csrf">
          <label for="answer">オンラインテキスト</label><textarea id="answer" name="onlinetext_editor[text]"></textarea>
          <button type="button">装飾</button><button type="button">表</button>
          <button name="submitbutton" type="submit" value="1">この状態で提出する</button><button name="cancel" type="submit" value="1">キャンセル</button>
        </form>
        <h3>提出ステータス</h3><table><tbody><tr><th scope="row">提出ステータス</th><td>まだ提出されていません。<div class="commentscontainer"><div id="cmt-tmpl">___name___</div><a class="comment-link" href="#">コメント (0)</a></div></td></tr></tbody></table>
      </div>
    `, { currentUrl: new URL(`${SITE_URL}/mod/assign/view.php?id=25544`), siteUrl: SITE_URL });

    expect(projection.screen.forms).toHaveLength(1);
    expect(projection.screen.title).toBe("予備解答欄２");
    expect(projection.screen.forms[0]?.actions.map((action) => action.label)).toEqual(["この状態で提出する", "キャンセル"]);
    expect(projection.screen.forms[0]?.actions.map((action) => [action.intent, action.purpose])).toEqual([["primary", "submit"], ["secondary", "previous"]]);
    expect(moodleDocumentText(projection.screen.document)).toContain("まだ提出されていません。");
    expect(moodleDocumentText(projection.screen.document)).not.toContain("___name___");
    expect(JSON.stringify(projection.screen)).not.toContain("private-csrf");
  });

  test("treats an assignment edit-submission GET as navigation rather than a final submission", () => {
    const projection = parseMoodlePage('<div id="region-main"><form action="/mod/assign/view.php" method="get"><input name="id" type="hidden" value="25544"><input name="action" type="hidden" value="editsubmission"><button type="submit">提出をアップロード・入力する</button></form></div>', { currentUrl: new URL(`${SITE_URL}/mod/assign/view.php?id=25544`), siteUrl: SITE_URL });
    expect(projection.screen.forms[0]?.actions[0]?.purpose).toBe("next");
  });
});
