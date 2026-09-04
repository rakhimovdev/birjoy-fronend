import { expect, test } from '@playwright/test';
import {
  createQaUser,
  deleteCurrentSessionUser,
  fetchAdIdByTitle,
  gotoRoute,
  signInWithQaUser,
  waitForPageSettled,
} from './helpers';

const mutationTestsEnabled = process.env.PLAYWRIGHT_ENABLE_MUTATION_TESTS === '1';
const isLocalRun = process.env.PLAYWRIGHT_USE_LOCAL === '1';
// These flows sign up real accounts and publish real listings. A failed cleanup
// leaves "[QA TEST]" content visible to the public (and to App Store review), so
// they stay local-only unless someone explicitly opts in to writing to a live
// environment.
const prodWritesAllowed = process.env.PLAYWRIGHT_ALLOW_PROD_WRITES === '1';
const mutationTargetIsSafe = isLocalRun || prodWritesAllowed;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test.describe.serial('auth and listing regression', () => {
  test.skip(!mutationTestsEnabled, 'Mutation QA flows are enabled only when requested.');
  test.skip(
    !mutationTargetIsSafe,
    'Mutation QA flows write real accounts and listings; run with PLAYWRIGHT_USE_LOCAL=1, or set PLAYWRIGHT_ALLOW_PROD_WRITES=1 to target a live environment on purpose.'
  );

  const qaUser = createQaUser('listing-owner');
  let createdAdId = '';
  let createdAdTitle = '';

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();

    try {
      await gotoRoute(page, '/sign-in');
      await signInWithQaUser(page, qaUser);
      await waitForPageSettled(page);
      await deleteCurrentSessionUser(page);
    } catch {
      // Best-effort cleanup only.
    } finally {
      await page.close();
    }
  });

  test('protected route redirects to sign-in with redirect target', async ({ page }) => {
    if (isLocalRun) {
      test.slow();
    }

    await gotoRoute(page, '/favorites');

    await page.waitForURL(/\/sign-in\?redirect=/, { timeout: 20_000 });
  });

  test('registration validates password visibility, confirmation, agreement, and success flow', async ({
    page,
  }) => {
    if (isLocalRun) {
      test.slow();
    }

    await gotoRoute(page, '/sign-up');
    const signUpForm = page
      .locator('form')
      .filter({
        has: page.getByLabel(/Parolni tasdiqlang|Confirm password|Подтвердите пароль/),
      })
      .first();

    const passwordInput = page.getByLabel(/^Parol$|^Password$|^Пароль$/);
    const confirmPasswordInput = page.getByLabel(
      /Parolni tasdiqlang|Confirm password|Подтвердите пароль/
    );
    const toggleButtons = page.getByRole('button', {
      name: /Parolni ko['‘]rsatish|Parolni yashirish|Show password|Hide password|Показать пароль|Скрыть пароль/,
    });

    await expect(toggleButtons.first()).toBeVisible();
    await toggleButtons.first().click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    await toggleButtons.first().click();
    await expect(passwordInput).toHaveAttribute('type', 'password');

    await page.getByLabel(/Ism|Name|Имя/).fill(qaUser.name);
    await page.getByLabel(/Email/i).fill(qaUser.email);
    await page.getByLabel(/Telefon|Phone|Телефон/).fill(qaUser.phone);
    await page.getByLabel(/Joylashuv|Location|Локация/).fill(qaUser.location);
    await passwordInput.fill('short');
    await confirmPasswordInput.fill('different');
    await signUpForm
      .getByRole('button', { name: /Ro'yxatdan o'tish|Sign up|Зарегистрироваться/i })
      .click();

    await expect(
      page
        .getByText(/Parol juda qisqa|Password is too short|Пароль слишком короткий/)
        .first()
    ).toBeVisible();

    await passwordInput.fill(qaUser.password);
    await confirmPasswordInput.fill(qaUser.password);

    const agreementCheckbox = page.getByRole('checkbox');
    await expect(agreementCheckbox).toBeVisible();
    await signUpForm
      .getByRole('button', { name: /Ro'yxatdan o'tish|Sign up|Зарегистрироваться/i })
      .click();
    await expect(
      page.getByText(/Foydalanish shartlari|Shartlarga rozilik|Terms|условиями/i).first()
    ).toBeVisible();

    await agreementCheckbox.check();
    await signUpForm
      .getByRole('button', { name: /Ro'yxatdan o'tish|Sign up|Зарегистрироваться/i })
      .click();

    await page.waitForURL(/\/profile/, { timeout: 20_000 });
  });

  test('duplicate registration rules reject reused email and phone', async ({ page }) => {
    if (isLocalRun) {
      test.slow();
    }

    await gotoRoute(page, '/sign-up');
    const signUpForm = page
      .locator('form')
      .filter({
        has: page.getByLabel(/Parolni tasdiqlang|Confirm password|Подтвердите пароль/),
      })
      .first();

    await page.getByLabel(/Ism|Name|Имя/).fill(`${qaUser.name} duplicate email`);
    await page.getByLabel(/Email/i).fill(qaUser.email);
    await page.getByLabel(/Telefon|Phone|Телефон/).fill(`+9989${Math.floor(200000000 + Math.random() * 699999999)}`.slice(0, 13));
    await page.getByLabel(/Joylashuv|Location|Локация/).fill(qaUser.location);
    await page.getByLabel(/^Parol$|^Password$|^Пароль$/).fill(qaUser.password);
    await page
      .getByLabel(/Parolni tasdiqlang|Confirm password|Подтвердите пароль/)
      .fill(qaUser.password);
    await page.getByRole('checkbox').check();
    await signUpForm
      .getByRole('button', { name: /Ro'yxatdan o'tish|Sign up|Зарегистрироваться/i })
      .click();
    await expect(page.getByText(/email band|email already exists|email already/i).first()).toBeVisible();

    await page.getByLabel(/Ism|Name|Имя/).fill(`${qaUser.name} duplicate phone`);
    await page.getByLabel(/Email/i).fill(`duplicate-phone.${Date.now()}@example.com`);
    await page.getByLabel(/Telefon|Phone|Телефон/).fill(qaUser.phone);
    await signUpForm
      .getByRole('button', { name: /Ro'yxatdan o'tish|Register|Регистрация/ })
      .click();
    await expect(
      page.getByText(/telefon.*mavjud|phone.*already exists|phone.*already in use/i).first()
    ).toBeVisible();
  });

  test('auto listing editor exposes vehicle-specific fields', async ({ page }) => {
    if (isLocalRun) {
      test.slow();
    }

    await signInWithQaUser(page, qaUser);
    await waitForPageSettled(page);
    await page.waitForURL(/\/profile/, { timeout: 20_000 });

    await gotoRoute(page, '/ads/create?vertical=auto');
    await expect(page.getByLabel(/Fuel|Yonilg|Топливо/i).first()).toBeVisible();
    await expect(page.getByLabel(/Year|Yil|Год/i).first()).toBeVisible();
    await expect(page.getByLabel(/Transmission|Korobka|Uzatish/i).first()).toBeVisible();
  });

  test('login, search, favorites, create, edit, and delete listing flows work', async ({ page }) => {
    if (isLocalRun) {
      test.slow();
    }

    await signInWithQaUser(page, qaUser);
    await waitForPageSettled(page);
    await page.waitForURL(/\/profile/, { timeout: 20_000 });

    await gotoRoute(page, '/uy-joy');
    const searchbox = page.getByRole('searchbox').first();
    await searchbox.fill('Toshkent');
    await searchbox.press('Enter');
    await expect(page).toHaveURL(/[\?&]q=Toshkent/);

    await gotoRoute(page, '/ads/create?vertical=market');

    createdAdTitle = `[QA TEST] Market Listing ${Date.now()}`;

    await page.getByLabel(/Sarlavha|Title|Заголовок/).fill(createdAdTitle);

    await page.locator('#condition').click();
    await page.getByRole('option', { name: /Yangi|New|Новый/ }).click();

    await page.getByLabel(/Narx|Price|Цена/).fill('123');
    await page.getByLabel(/Tavsif|Description|Описание/).fill(
      'QA regression listing created by Playwright.'
    );
    await page.getByLabel(/Joylashuv|Location|Локация/).fill('Toshkent');
    await page.getByLabel(/Telefon|Phone|Телефон/).fill(qaUser.phone);

    await page.getByRole('button', { name: /E’lonni chop etish|Publish Listing|Опубликовать/i }).click();
    await page.waitForURL(/\/market/, { timeout: 20_000 });

    createdAdId = await fetchAdIdByTitle(page, createdAdTitle);
    await gotoRoute(page, `/ads/${createdAdId}`);
    await expect(
      page.getByRole('heading', { name: new RegExp(escapeRegExp(createdAdTitle)) })
    ).toBeVisible();

    const favoriteButton = page.getByRole('button', { name: /Saqlanganlar|Favorites|Избранное/ }).first();
    await favoriteButton.click();
    await expect(
      page.getByText(/Saqlanganlarga qo'shildi|Added to favorites|Добавлено в избранное/).first()
    ).toBeVisible();

    await gotoRoute(page, '/favorites');
    await expect(page.getByText(createdAdTitle)).toBeVisible();

    await gotoRoute(page, `/ads/${createdAdId}/edit`);
    createdAdTitle = `${createdAdTitle} Updated`;
    await page.getByLabel(/Sarlavha|Title|Заголовок/).fill(createdAdTitle);
    await page.getByRole('button', { name: /O‘zgarishlarni saqlash|Save Changes|Сохранить изменения/ }).click();
    await page.waitForURL(new RegExp(`/ads/${createdAdId}$`), { timeout: 20_000 });
    await expect(
      page.getByRole('heading', { name: new RegExp(escapeRegExp(createdAdTitle)) })
    ).toBeVisible();

    await page.getByRole('button', { name: /O‘chirish|Delete|Удалить/ }).first().click();
    await page.getByRole('button', { name: /^O‘chirish$|^Delete$|^Удалить$/ }).last().click();
    await page.waitForURL(/\/market/, { timeout: 20_000 });

    await gotoRoute(page, `/ads/${createdAdId}`);
    await expect(
      page.getByText(/Eʼlon topilmadi|Listing not found|Объявление не найдено/).first()
    ).toBeVisible();
  });
});
