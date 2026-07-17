# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: prod-smoke.spec.ts >> production smoke >> public search updates results and preserves query in the URL
- Location: tests/e2e/prod-smoke.spec.ts:81:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('input[placeholder*="qidiring"]:visible, input[placeholder*="Search"]:visible, input[placeholder*="Поиск"]:visible').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('input[placeholder*="qidiring"]:visible, input[placeholder*="Search"]:visible, input[placeholder*="Поиск"]:visible').first()

```

```yaml
- region "Notifications (F8)":
  - list
```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test';
  2   | import { gotoRoute, waitForPageSettled } from './helpers';
  3   | 
  4   | const isLocalRun = process.env.PLAYWRIGHT_USE_LOCAL === '1';
  5   | 
  6   | test.describe('production smoke', () => {
  7   |   test('homepage, navigation, redirects, and key metadata work', async ({ page, baseURL }) => {
  8   |     if (isLocalRun) {
  9   |       test.slow();
  10  |     }
  11  | 
  12  |     const consoleIssues: string[] = [];
  13  |     const requestFailures: string[] = [];
  14  | 
  15  |     page.on('console', (message) => {
  16  |       if (
  17  |         message.type() === 'error' &&
  18  |         !/Failed to load resource: the server responded with a status of 404/i.test(
  19  |           message.text()
  20  |         )
  21  |       ) {
  22  |         consoleIssues.push(message.text());
  23  |       }
  24  |     });
  25  | 
  26  |     page.on('requestfailed', (request) => {
  27  |       const failureText = request.failure()?.errorText || '';
  28  | 
  29  |       if (/ERR_ABORTED/i.test(failureText)) {
  30  |         return;
  31  |       }
  32  | 
  33  |       requestFailures.push(`${request.method()} ${request.url()} :: ${failureText}`);
  34  |     });
  35  | 
  36  |     await gotoRoute(page, '/');
  37  | 
  38  |     await expect(page).toHaveTitle(/BirJoy/i);
  39  |     await expect(page).toHaveURL(/\/uy-joy(?:\?.*)?$/);
  40  | 
  41  |     const desktopNavLinks = page
  42  |       .locator('section[aria-label="Marketplace verticals"] a')
  43  |       .or(page.locator('.category-bar-grid a'));
  44  | 
  45  |     await expect(desktopNavLinks).toHaveCount(4);
  46  |     await expect(desktopNavLinks.nth(0)).toContainText(/Uy-joy/i);
  47  |     await expect(desktopNavLinks.nth(1)).toContainText(/Avtomobil/i);
  48  |     await expect(desktopNavLinks.nth(2)).toContainText(/Market/i);
  49  |     await expect(desktopNavLinks.nth(3)).toContainText(/Taomlar/i);
  50  | 
  51  |     await gotoRoute(page, '/privacy-policy');
  52  |     await expect(page).toHaveURL(/\/privacy-policy$/);
  53  | 
  54  |     await gotoRoute(page, '/about');
  55  |     await expect(page).toHaveURL(/\/about$/);
  56  | 
  57  |     await gotoRoute(page, '/this-route-should-not-exist');
  58  |     await expect(page.getByText(/Sahifa topilmadi|Page not found|Страница не найдена/)).toBeVisible();
  59  | 
  60  |     expect.soft(consoleIssues, `Console errors on ${baseURL}`).toEqual([]);
  61  |     expect.soft(requestFailures, `Failed requests on ${baseURL}`).toEqual([]);
  62  |   });
  63  | 
  64  |   test('mobile bottom navigation is visible and usable', async ({ page }) => {
  65  |     if (isLocalRun) {
  66  |       test.slow();
  67  |     }
  68  | 
  69  |     await page.setViewportSize({ width: 390, height: 844 });
  70  |     await gotoRoute(page, '/uy-joy');
  71  | 
  72  |     const bottomNav = page.locator('nav[aria-label="Marketplace navigation"]');
  73  |     await expect(bottomNav).toBeVisible();
  74  |     await expect(bottomNav.getByRole('link', { name: /Bosh sahifa|Home|Главная/ })).toBeVisible();
  75  |     await expect(bottomNav.getByRole('link', { name: /Qidirish|Search|Поиск/ })).toBeVisible();
  76  |     await expect(bottomNav.getByRole('link', { name: /E'lon berish|Подать объявление|Post Ad/i })).toBeVisible();
  77  |     await expect(bottomNav.getByRole('link', { name: /Chat|Чат/ })).toBeVisible();
  78  |     await expect(bottomNav.getByRole('link', { name: /Profil|Profile|Профиль/ })).toBeVisible();
  79  |   });
  80  | 
  81  |   test('public search updates results and preserves query in the URL', async ({ page }) => {
  82  |     if (isLocalRun) {
  83  |       test.slow();
  84  |     }
  85  | 
  86  |     await gotoRoute(page, '/uy-joy');
  87  | 
  88  |     const searchbox = page
  89  |       .locator(
  90  |         'input[placeholder*="qidiring"]:visible, input[placeholder*="Search"]:visible, input[placeholder*="Поиск"]:visible'
  91  |       )
  92  |       .first();
  93  | 
> 94  |     await expect(searchbox).toBeVisible();
      |                             ^ Error: expect(locator).toBeVisible() failed
  95  |     await searchbox.fill('Toshkent');
  96  |     await searchbox.press('Enter');
  97  | 
  98  |     await expect(page).toHaveURL(/[\?&]q=Toshkent/);
  99  |     await expect(searchbox).toHaveValue('Toshkent');
  100 |     await expect(page.locator('main')).toContainText(
  101 |       /Filtrlangan natijalar|Mos e'lon topilmadi|Filtered results|No matching listings found|Отфильтрованные результаты|Подходящих объявлений не найдено/i
  102 |     );
  103 |   });
  104 | });
  105 | 
```