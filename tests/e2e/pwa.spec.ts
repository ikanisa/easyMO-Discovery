import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from '@axe-core/playwright';

test('app shell renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#root')).toBeVisible();
});

test('offline fallback is reachable', async ({ page, context }) => {
  await page.goto('/');
  await context.setOffline(true);
  await page.goto('/offline.html');
  await expect(page.getByText("You're offline")).toBeVisible();
  await context.setOffline(false);
});

test('basic accessibility scan', async ({ page }) => {
  await page.goto('/');
  await injectAxe(page);
  await checkA11y(page, undefined, {
    detailedReport: true,
    detailedReportOptions: { html: true },
  });
});
