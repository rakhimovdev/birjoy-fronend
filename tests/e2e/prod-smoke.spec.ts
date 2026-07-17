import { expect, test } from '@playwright/test';
import { gotoRoute, waitForPageSettled } from './helpers';

const isLocalRun = process.env.PLAYWRIGHT_USE_LOCAL === '1';

test.describe('production smoke', () => {
  test('homepage, navigation, redirects, and key metadata work', async ({ page, baseURL }) => {
    if (isLocalRun) {
      test.slow();
    }

    const consoleIssues: string[] = [];
    const requestFailures: string[] = [];

    page.on('console', (message) => {
      if (
        message.type() === 'error' &&
        !/Failed to load resource: the server responded with a status of 404/i.test(
          message.text()
        )
      ) {
        consoleIssues.push(message.text());
      }
    });

    page.on('requestfailed', (request) => {
      const failureText = request.failure()?.errorText || '';

      if (/ERR_ABORTED/i.test(failureText)) {
        return;
      }

      requestFailures.push(`${request.method()} ${request.url()} :: ${failureText}`);
    });

    await gotoRoute(page, '/');

    await expect(page).toHaveTitle(/BirJoy/i);
    await expect(page).toHaveURL(/\/uy-joy(?:\?.*)?$/);

    const desktopNavLinks = page
      .locator('section[aria-label="Marketplace verticals"] a')
      .or(page.locator('.category-bar-grid a'));

    await expect(desktopNavLinks).toHaveCount(4);
    await expect(desktopNavLinks.nth(0)).toContainText(/Uy-joy/i);
    await expect(desktopNavLinks.nth(1)).toContainText(/Avtomobil/i);
    await expect(desktopNavLinks.nth(2)).toContainText(/Market/i);
    await expect(desktopNavLinks.nth(3)).toContainText(/Taomlar/i);

    await gotoRoute(page, '/privacy-policy');
    await expect(page).toHaveURL(/\/privacy-policy$/);

    await gotoRoute(page, '/about');
    await expect(page).toHaveURL(/\/about$/);

    await gotoRoute(page, '/this-route-should-not-exist');
    await expect(page.getByText(/Sahifa topilmadi|Page not found|Страница не найдена/)).toBeVisible();

    expect.soft(consoleIssues, `Console errors on ${baseURL}`).toEqual([]);
    expect.soft(requestFailures, `Failed requests on ${baseURL}`).toEqual([]);
  });

  test('mobile bottom navigation is visible and usable', async ({ page }) => {
    if (isLocalRun) {
      test.slow();
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await gotoRoute(page, '/uy-joy');

    const bottomNav = page.locator('nav[aria-label="Marketplace navigation"]');
    await expect(bottomNav).toBeVisible();
    await expect(bottomNav.getByRole('link', { name: /Bosh sahifa|Home|Главная/ })).toBeVisible();
    await expect(bottomNav.getByRole('link', { name: /Qidirish|Search|Поиск/ })).toBeVisible();
    await expect(bottomNav.getByRole('link', { name: /E'lon berish|Подать объявление|Post Ad/i })).toBeVisible();
    await expect(bottomNav.getByRole('link', { name: /Chat|Чат/ })).toBeVisible();
    await expect(bottomNav.getByRole('link', { name: /Profil|Profile|Профиль/ })).toBeVisible();
  });

  test('public search updates results and preserves query in the URL', async ({ page }) => {
    if (isLocalRun) {
      test.slow();
    }

    await gotoRoute(page, '/uy-joy');

    const searchbox = page
      .locator(
        'input[placeholder*="qidiring"]:visible, input[placeholder*="Search"]:visible, input[placeholder*="Поиск"]:visible'
      )
      .first();

    await expect(searchbox).toBeVisible();
    await searchbox.fill('Toshkent');
    await searchbox.press('Enter');

    await expect(page).toHaveURL(/[\?&]q=Toshkent/);
    await expect(searchbox).toHaveValue('Toshkent');
    await expect(page.locator('main')).toContainText(
      /Filtrlangan natijalar|Mos e'lon topilmadi|Filtered results|No matching listings found|Отфильтрованные результаты|Подходящих объявлений не найдено/i
    );
  });
});
