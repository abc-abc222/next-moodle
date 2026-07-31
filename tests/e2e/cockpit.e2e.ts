import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

async function signIn(page: import("@playwright/test").Page, username: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Moodleユーザー名").fill(username);
  await page.getByLabel("パスワード").fill(password);
  await page.getByRole("button", { name: "Moodleでログイン" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; pointer-events: none !important; }" });
}

test("student cockpit reads the mock Moodle core routes without exposing a token", async ({ page }) => {
  await signIn(page, "alice", "alice-password");

  await expect(page.getByRole("heading", { name: "学習ワークスペース" })).toBeVisible();
  await page.keyboard.press("Control+K");
  await page.getByRole("dialog", { name: "画面とコースを検索" }).getByLabel("検索語").fill("knowledge check");
  await expect(page.getByRole("option").filter({ hasText: "Week 1 knowledge check" })).toBeVisible();
  await page.getByRole("option").filter({ hasText: "Week 1 knowledge check" }).click();
  await expect(page).toHaveURL(/\/activities\/9105/);
  await page.goto("/courses");
  const aliceCourse = page.getByRole("main").getByRole("link", {
    name: "Introduction to Marine Biology",
  });
  await expect(aliceCourse).toBeVisible();
  await page.getByRole("button", { name: "Introduction to Marine Biologyにスターを付ける" }).click();
  await expect(page.getByRole("button", { name: "Introduction to Marine Biologyのスターを解除" })).toBeVisible();
  await aliceCourse.click();
  await expect(page.getByText("Tide pool field notes")).toBeVisible();
  await expect(page.getByText("Bring a notebook and review the safety checklist before class.")).toBeVisible();
  await expect(page.getByRole("link", { name: /Moodle/ })).toHaveCount(0);
  await page.goto("/assignments/9101");
  await expect(page.getByRole("heading", { name: "Tide pool field notes" })).toBeVisible();
  const urlActivityResponse = await page.goto("/activities/9122");
  expect(urlActivityResponse?.status()).toBe(200);
  await expect(page).toHaveURL(/\/activities\/9122$/);
  await expect(page.getByTestId("html-activity-workspace")).toBeVisible();
  await expect(page.getByRole("heading", { name: "URL learning content" })).toBeVisible();
  await expect(page.getByRole("link", { name: "学習リソースを開く" })).toHaveAttribute("href", "https://resources.synthetic.invalid/lesson-video");
  await expect(page.getByRole("link", { name: "学習リソースを開く" })).toHaveAttribute("target", "_blank");
  await page.goto("/calendar");
  await expect(page.getByRole("heading", { name: "カレンダー" })).toBeVisible();
  await page.goto("/notifications");
  await expect(page.getByRole("heading", { name: /Notifications|通知/ })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("synthetic-alice-token");
});

test("context panels persist locally and inspector sheets restore keyboard focus", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await signIn(page, "alice", "alice-password");
  await page.goto("/courses/101");

  await page.getByRole("button", { name: "文脈パネルを閉じる" }).click();
  await expect(page.getByRole("button", { name: "文脈パネルを開く" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("next-moodle:layout:v2:context:course"))).toBe("collapsed");
  await page.reload();
  await expect(page.getByRole("button", { name: "文脈パネルを開く" })).toBeVisible();
  await page.getByRole("button", { name: "文脈パネルを開く" }).click();

  const inspectorTrigger = page.getByRole("button", { name: "コース情報" });
  await inspectorTrigger.click();
  await expect(page.getByRole("dialog", { name: "コース情報" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "コース情報" })).not.toBeVisible();
  await expect(inspectorTrigger).toBeFocused();
});

test("a second fixture account cannot see Alice's courses", async ({ page }) => {
  await signIn(page, "bob", "bob-password");

  await page.goto("/courses");
  await expect(
    page.getByRole("main").getByRole("link", { name: "Archives and Public Memory" }),
  ).toBeVisible();
  await expect(page.getByText("Introduction to Marine Biology")).toHaveCount(0);

  const response = await page.goto("/courses/101");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "ページが見つかりません" })).toBeVisible();
});

test("restricted activities return a real forbidden response without leaking content", async ({ page }) => {
  await signIn(page, "alice", "alice-password");

  const response = await page.goto("/activities/9120");
  expect(response?.status()).toBe(403);
  await expect(page.getByRole("heading", { name: "アクセスは禁止されています" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("This restricted fixture must never be rendered");
});

test("assignment draft, confirmation, client PDF, and ICS stay usable", async ({ page }) => {
  await signIn(page, "alice", "alice-password");
  await page.goto("/assignments/9101");
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; pointer-events: none !important; }" });
  await expect(page.getByText("グループID 14 の共同提出として保存します。")).toBeVisible();
  await expect(page.getByRole("button", { name: "提出を確定", exact: true })).toBeDisabled();
  const chooserReady = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "ファイルを選択", exact: true }).click();
  const chooser = await chooserReady;
  await chooser.setFiles({ buffer: Buffer.from("field notes"), mimeType: "text/plain", name: "notes.txt" });
  await expect(page.getByText("notes.txt")).toBeVisible();
  await expect(page.getByRole("button", { name: "提出を確定", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "提出を確定" }).click();
  await expect(page.getByText("この内容で提出を確定しますか？")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /成果物であることに同意/ })).toBeVisible();
  await page.getByRole("button", { name: "戻る" }).click();

  await page.goto("/tools/pdf");
  const pdf = await PDFDocument.create();
  pdf.addPage([200, 300]);
  const pdfBytes = await pdf.save();
  await page.locator('input[type="file"][accept*="application/pdf"]').setInputFiles({
    buffer: Buffer.from(pdfBytes), mimeType: "application/pdf", name: "one.pdf",
  });
  await expect(page.getByText("one.pdf")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "PDFをダウンロード" }).click();
  expect((await download).suggestedFilename()).toBe("combined.pdf");

  await page.goto("/calendar");
  const calendarDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: ".ics保存" }).click();
  expect((await calendarDownload).suggestedFilename()).toBe("learning-calendar.ics");
  await page.getByText("予定を追加").click();
  await page.getByLabel("予定名").fill("Review fixture notes");
  await page.getByLabel("開始日時").fill("2026-07-24T18:00");
  await page.getByRole("button", { name: "追加", exact: true }).click();
  await expect(page.getByText("Review fixture notes")).toBeVisible();
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "予定を削除" }).click();
  await expect(page.getByText("Review fixture notes")).toHaveCount(0);
});

test("standard activities remain inside the Editorial Native workspace", async ({ page }) => {
  await signIn(page, "alice", "alice-password");

  await page.goto("/activities/9105");
  await expect(page.getByRole("heading", { name: "小テストを開始" })).toBeVisible();
  await page.getByRole("button", { name: "受験を開始" }).click();
  const answer = page.getByLabel("Answer text · Question 1");
  await expect(answer).toBeVisible();
  await expect(page.locator(".ui-quiz-question__meta small", { hasText: "Marked out of 1.00" })).toBeVisible();
  await answer.fill("Attendance");
  await expect(page.getByText("保存済み")).toBeVisible();
  await page.getByRole("button", { name: "Clear my choice" }).click();
  await expect(answer).toHaveValue("");
  await answer.fill("Attendance");
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "回答を提出" }).click();
  await expect(page.getByText("提出済み")).toBeVisible();

  await page.goto("/activities/9106");
  await expect(page.locator("#forum-title")).toBeVisible();
  await page.getByLabel("返信").fill("Record wind and cloud cover.");
  await page.getByRole("button", { name: "返信を投稿" }).click();
  await expect(page.getByText("Record wind and cloud cover.")).toBeVisible();
  await page.getByRole("button", { name: "既読にする" }).click();
  await expect(page.getByRole("button", { name: "既読にする" })).toHaveCount(0);
  await page.getByRole("button", { name: "購読", exact: true }).click();
  await expect(page.getByRole("button", { name: "購読解除" })).toBeVisible();

  await page.goto("/activities/9107");
  await page.getByText("Tidal marsh").click();
  await page.getByRole("button", { name: "回答を送信" }).click();
  await expect(page.getByText("回答を更新")).toBeVisible();

  await page.goto("/activities/9108");
  await expect(page.locator("#glossary-title")).toBeVisible();
  await page.getByText("用語を追加").click();
  await page.getByRole("textbox", { name: "用語" }).fill("Quadrat");
  await page.getByRole("textbox", { name: "説明" }).fill("A fixed sampling frame.");
  await page.getByRole("button", { name: "用語を保存" }).click();
  await expect(page.getByText("Quadrat")).toBeVisible();

  await page.goto("/activities/9109");
  await expect(page.locator("#wiki-title")).toBeVisible();
  await page.getByRole("button", { name: "編集" }).click();
  const wikiEditor = page.getByLabel("Field protocolの本文");
  await wikiEditor.fill("Record location, weather, and salinity.");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByText("Record location, weather, and salinity.")).toBeVisible();

  await page.goto("/activities/9110");
  await expect(page.locator("#feedback-title")).toBeVisible();
  await page.getByRole("button", { name: "回答を開始" }).click();
  await page.getByRole("textbox", { name: "What worked well? *" }).fill("The checklist kept observations consistent.");
  await page.getByText("Tidal marsh").click();
  await page.getByRole("button", { name: "回答を送信" }).click();
  await expect(page.getByText("回答はMoodleへ保存されました。")).toBeVisible();

  await page.goto("/activities/9111");
  await expect(page.locator("#lesson-title")).toBeVisible();
  await page.getByRole("button", { name: "レッスンを開始" }).click();
  await page.getByText("Location").click();
  await page.getByRole("button", { name: "回答して次へ" }).click();
  await expect(page.getByText("学習結果はMoodleへ保存されています。")).toBeVisible();

  await page.goto("/activities/9112");
  await expect(page.locator("#database-title")).toBeVisible();
  await page.getByText("レコードを追加").click();
  await page.getByLabel("Label *").fill("Quadrat 4");
  await page.getByLabel("Notes").fill("Three species recorded at low tide.");
  await page.getByRole("button", { name: "レコードを保存" }).click();
  await expect(page.getByText("Quadrat 4")).toBeVisible();

  await page.goto("/activities/9113");
  await expect(page.locator("#workshop-title")).toBeVisible();
  await page.getByLabel("タイトル").fill("Field comparison");
  await page.getByLabel("提出内容").fill("The upper zone contained fewer visible species.");
  await page.getByRole("button", { name: "提出を保存" }).click();
  await expect(page.getByLabel("タイトル")).toHaveValue("Field comparison");

  await page.goto("/activities/9114");
  await expect(page.getByTestId("html-activity-workspace")).toBeVisible();
  await expect(page.getByRole("heading", { name: "SCORM learning content" })).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(0);

  await page.goto("/activities/9115");
  await expect(page.getByTestId("html-activity-workspace")).toBeVisible();
  await expect(page.getByRole("heading", { name: "H5PACTIVITY learning content" })).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(0);

  await page.goto("/activities/9116");
  await expect(page.getByTestId("html-activity-workspace")).toBeVisible();
  await expect(page.getByRole("heading", { name: "LTI learning content" })).toBeVisible();

  await page.goto("/activities/9117");
  await expect(page.getByTestId("html-activity-workspace")).toBeVisible();
  await expect(page.getByRole("heading", { name: "BIGBLUEBUTTONBN learning content" })).toBeVisible();
});

test("quiz attempts scroll through the application main region on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ height: 667, width: 375 });
  await signIn(page, "alice", "alice-password");

  await page.goto("/activities/9105");
  await page.getByRole("button", { name: "受験を開始" }).click();
  await expect(page.getByLabel("Answer text · Question 1")).toBeVisible();

  const main = page.locator("#main-content");
  await expect.poll(async () => main.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  await main.hover();
  await page.mouse.wheel(0, 640);
  await expect.poll(async () => main.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: "回答を提出" })).toBeVisible();
});

test("API 非対応 Questionnaire is parsed, submitted, and reported inside the workspace", async ({ page }) => {
  await signIn(page, "alice", "alice-password");

  await page.goto("/activities/9198");
  await expect(page.getByTestId("html-activity-workspace")).toBeVisible();
  await page.getByRole("radio", { name: "はい" }).check();
  await page.getByRole("textbox", { name: "連絡事項" }).fill("防寒具を準備しました。");
  await page.getByRole("button", { name: "回答を送信" }).click();
  await expect(page.getByRole("heading", { name: "回答内容を確認" })).toBeVisible();
  await page.getByRole("button", { name: "この内容で確定" }).click();
  await expect(page.getByRole("heading", { name: "提出した回答" })).toBeVisible();

  await page.getByRole("button", { name: "移動・検索" }).click();
  await page.getByLabel("検索語").fill("http://127.0.0.1:28765/mod/questionnaire/view.php?id=9198");
  await expect(page.getByRole("option", { name: /Moodleの活動を開く/ })).toBeVisible();
  await page.getByRole("option", { name: /Moodleの活動を開く/ }).click();
  await expect(page).toHaveURL(/\/activities\/9198$/);

  await page.goto("/messages/new?courseId=101");
  await expect(page.getByRole("heading", { name: "先生へ連絡" })).toBeVisible();
  await expect(page.getByLabel("送信先")).toContainText("Aoi Mentor");
  await page.getByLabel("件名").fill("Field session question");
  await page.getByLabel("本文").fill("Could you confirm the observation meeting time?");
  await page.getByRole("button", { name: "送信内容を確認" }).click();
  await expect(page.getByRole("heading", { name: "送信前の確認" })).toBeVisible();
  await page.getByRole("button", { name: "送信を確定" }).click();
  await expect(page).toHaveURL(/\/messages\/1001$/);
  await expect(page.getByText("The next study session starts at 16:00.", { exact: true })).toBeVisible();
  await expect(page.locator(".ui-message-thread")).not.toContainText("<p>");
  const sentMessage = page.getByRole("main").locator(".ui-message-thread__scroll > ol li[data-own='true'] p");
  await expect(sentMessage).toContainText("件名: Field session question");
  await expect(sentMessage).toContainText("Could you confirm the observation meeting time?");
  await page.getByLabel("メッセージ").fill("Thanks, I will be there.");
  await page.getByRole("button", { name: "送信" }).click();
  await expect(page.getByRole("main").locator(".ui-message-thread__scroll")).toContainText("Thanks, I will be there.");
  await expect(page.getByText("Enterで改行 · ⌘ / Ctrl + Enterで送信")).toBeVisible();
  await expect(page.getByRole("main")).toContainText("Aoi Mentor");
});
