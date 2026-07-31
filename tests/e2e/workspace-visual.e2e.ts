import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { height: 900, name: "mobile", width: 375 },
  { height: 1024, name: "tablet", width: 768 },
  { height: 900, name: "desktop", width: 1280 },
  { height: 1000, name: "wide", width: 1600 },
] as const;

const ROUTES = [
  { heading: "学習ワークスペース", name: "dashboard", path: "/dashboard" },
  { heading: "コース", name: "course-index", path: "/courses" },
  { heading: "Introduction to Marine Biology", name: "course", path: "/courses/101" },
  { heading: "Tide pool field notes", name: "assignment", path: "/assignments/9101" },
  { heading: "Fieldwork preparation survey", name: "questionnaire", path: "/activities/9198" },
  { heading: "カレンダー", name: "calendar", path: "/calendar" },
  { heading: "通知", name: "notifications", path: "/notifications" },
  { heading: "成績", name: "grades", path: "/grades" },
  { heading: "プライベートファイル", name: "files", path: "/files" },
  { heading: "メッセージ", name: "messages-index", path: "/messages" },
  { heading: "Study group", name: "messages", path: "/messages/1001" },
  { heading: "先生へ連絡", name: "teacher-contact", path: "/messages/new?courseId=101" },
  { heading: "PDFツール", name: "pdf", path: "/tools/pdf" },
] as const;

test("captures the responsive Editorial Native workspace on real routes", async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/login");
  await page.getByLabel("Moodleユーザー名").fill("alice");
  await page.getByLabel("パスワード").fill("alice-password");
  await page.getByRole("button", { name: "Moodleでログイン" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ height: viewport.height, width: viewport.width });
    for (const theme of ["dark", "light"] as const) {
      await page.evaluate((value) => localStorage.setItem("next-moodle-theme", value), theme);
      for (const route of ROUTES) {
        await page.goto(route.path);
        await page.addStyleTag({ content: "nextjs-portal { display: none !important; pointer-events: none !important; }" });
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await expect(page.locator("#main-content")).toBeVisible();
        await expect(page.getByRole("heading", { name: route.heading, exact: true }).first()).toBeVisible();
        if (route.name === "teacher-contact" && viewport.width >= 768) {
          await expect(page.getByLabel("送信先")).toHaveValue(/.+/);
        }
        await expect(page.locator("main")).toHaveCount(1);
        const geometry = await page.evaluate(() => ({
          horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          mainHorizontalOverflow: (() => {
            const main = document.querySelector("#main-content");
            return main === null ? false : main.scrollWidth > main.clientWidth;
          })(),
          shellHeight: document.querySelector(".ui-app-shell")?.getBoundingClientRect().height ?? 0,
          viewportHeight: window.innerHeight,
        }));
        expect(geometry.horizontalOverflow).toBe(false);
        expect(geometry.mainHorizontalOverflow).toBe(false);
        expect(Math.abs(geometry.shellHeight - geometry.viewportHeight)).toBeLessThanOrEqual(1);
        await page.screenshot({
          animations: "disabled",
          caret: "initial",
          path: `test-results/visual/workspace-${route.name}-${viewport.name}-${theme}.png`,
        });
      }
    }
  }
});
