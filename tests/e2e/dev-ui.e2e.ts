import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function hideDevelopmentChrome(page: Page) {
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
}

const VIEWPORTS = [
  { height: 900, name: "mobile", width: 375 },
  { height: 1024, name: "tablet", width: 768 },
  { height: 900, name: "desktop", width: 1280 },
  { height: 1000, name: "wide", width: 1600 },
] as const;

const THEMES = ["dark", "light"] as const;

for (const viewport of VIEWPORTS) {
  for (const theme of THEMES) {
    test(`renders the ${theme} showcase without overflow at ${viewport.width}px`, async ({
      page,
    }) => {
      // Given
      await page.setViewportSize({ height: viewport.height, width: viewport.width });
      await page.addInitScript(
        ({ key, value }) => window.localStorage.setItem(key, value),
        { key: "next-moodle-theme", value: theme },
      );

      // When
      await page.goto("/dev/ui");
      await hideDevelopmentChrome(page);

      // Then
      await expect(page.getByTestId("ui-showcase")).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(page.locator(".ui-button").first()).toBeVisible();
      await expect(page.locator(".ui-field")).toHaveCount(8);
      await expect(page.locator(".ui-badge")).toHaveCount(7);
      await expect(page.locator(".ui-notice")).toHaveCount(4);
      await expect(page.locator(".ui-skeleton")).toHaveCount(3);
      await expect(page.getByTestId("responsive-stack-specimen")).toBeVisible();

      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(hasHorizontalOverflow).toBe(false);

      const undersizedTargets = await page.evaluate(() =>
        Array.from(document.querySelectorAll("button, input:not([type=checkbox]):not(.ui-sr-only)")).flatMap((element) => {
          const rect = element.getBoundingClientRect();
          if (rect.width >= 44 && rect.height >= 44) {
            return [];
          }
          return [
            {
              height: rect.height,
              label: element.getAttribute("aria-label") ?? element.textContent?.trim() ?? "input",
              width: rect.width,
            },
          ];
        }),
      );
      expect(undersizedTargets).toEqual([]);

      if (viewport.width === 375) {
        const stack = page.getByTestId("responsive-stack-specimen");
        const actionPositions = await stack.locator("button").evaluateAll((buttons) =>
          buttons.map((button) => button.getBoundingClientRect().top),
        );
        expect(actionPositions[1]).toBeGreaterThan(actionPositions[0] ?? 0);
      }

      await page.screenshot({
        animations: "disabled",
        caret: "initial",
        fullPage: true,
        path: `test-results/visual/${viewport.name}-${theme}.png`,
      });
    });
  }
}

test("changes theme and exposes a visible keyboard focus treatment", async ({ page }) => {
  // Given
  await page.setViewportSize({ height: 900, width: 375 });
  await page.goto("/dev/ui");
  await hideDevelopmentChrome(page);
  const darkButton = page.getByRole("button", { name: "ダーク" }).first();

  // When
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(darkButton).toBeFocused();
  await page.keyboard.press("Enter");

  // Then
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(darkButton).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(() => darkButton.evaluate((element) => element.matches(":focus-visible")))
    .toBe(true);
  const focusRing = await darkButton.evaluate(
    (element) => getComputedStyle(element).boxShadow,
  );
  expect(focusRing).not.toBe("none");
  expect(focusRing).toContain("0px 0px 0px 4px");
  await page.screenshot({
    animations: "disabled",
    fullPage: false,
    path: "test-results/visual/theme-focus.png",
  });
});

test.describe("reduced motion", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("keeps state feedback without directional movement", async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1280 });
    await page.goto("/dev/ui");
    await hideDevelopmentChrome(page);

    const dock = page.locator(".ui-action-dock").first();
    const row = page.locator(".ui-data-row").first();
    await row.hover();
    const motion = await dock.evaluate((element) => ({
      animationDuration: getComputedStyle(element).animationDuration,
    }));
    expect(motion.animationDuration).toBe("0.001s");
    await expect.poll(() => row.evaluate((element) => getComputedStyle(element).transform)).toBe("none");
    await page.screenshot({
      animations: "allow",
      caret: "initial",
      path: "test-results/visual/reduced-motion.png",
    });
  });
});

test("shows press feedback and returns to rest", async ({ page }) => {
  // Given
  await page.setViewportSize({ height: 720, width: 1280 });
  await page.goto("/dev/ui");
  await hideDevelopmentChrome(page);
  const primaryButton = page.getByRole("button", { name: "Save changes" });
  await primaryButton.scrollIntoViewIfNeeded();
  const box = await primaryButton.boundingBox();
  expect(box).not.toBeNull();
  if (!box) {
    return;
  }
  await page.screenshot({
    animations: "allow",
    path: "test-results/visual/button-rest.png",
  });

  // When
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();

  // Then
  await expect
    .poll(() => primaryButton.evaluate((element) => getComputedStyle(element).transform))
    .not.toBe("none");
  await page.screenshot({
    animations: "allow",
    path: "test-results/visual/button-pressed.png",
  });
  await page.mouse.up();
  await expect
    .poll(() => primaryButton.evaluate((element) => getComputedStyle(element).transform))
    .toBe("none");
  await page.screenshot({
    animations: "allow",
    path: "test-results/visual/button-settled.png",
  });
});
