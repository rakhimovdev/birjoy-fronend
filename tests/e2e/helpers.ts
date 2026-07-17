import { expect, type Page } from '@playwright/test';

export type QaUser = {
  name: string;
  email: string;
  phone: string;
  location: string;
  password: string;
};

export function createQaUser(label: string): QaUser {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    name: `[QA TEST] ${label} ${suffix}`,
    email: `qa.${label.toLowerCase().replace(/\s+/g, '-')}.${suffix}@example.com`,
    phone: `+9989${Math.floor(100000000 + Math.random() * 899999999)}`.slice(0, 13),
    location: 'Toshkent',
    password: `QaTest!${suffix.slice(-8)}`,
  };
}

export async function waitForPageSettled(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(() => document.readyState !== 'loading');
}

export async function gotoRoute(page: Page, url: string) {
  await page.goto(url, {
    waitUntil: 'domcontentloaded',
  });
  await waitForPageSettled(page);
}

export async function signUpWithQaUser(page: Page, user: QaUser) {
  await gotoRoute(page, '/sign-up');
  const signUpForm = page
    .locator('form')
    .filter({
      has: page.getByLabel(/Parolni tasdiqlang|Confirm password|Подтвердите пароль/),
    })
    .first();

  await page.getByLabel(/Ism|Name|Имя/).fill(user.name);
  await page.getByLabel(/Email/i).fill(user.email);
  await page.getByLabel(/Telefon|Phone|Телефон/).fill(user.phone);
  await page.getByLabel(/Joylashuv|Location|Локация/).fill(user.location);
  await page.getByLabel(/^Parol$|^Password$|^Пароль$/).fill(user.password);
  await page.getByLabel(/Parolni tasdiqlang|Confirm password|Подтвердите пароль/).fill(
    user.password
  );

  const agreementCheckbox = page.getByRole('checkbox');

  if (await agreementCheckbox.count()) {
    await agreementCheckbox.first().check();
  }

  await signUpForm
    .getByRole('button', { name: /Ro'yxatdan o'tish|Sign up|Зарегистрироваться/i })
    .click();
}

export async function signInWithQaUser(page: Page, user: QaUser) {
  await gotoRoute(page, '/sign-in');
  const signInForm = page
    .locator('form')
    .filter({
      has: page.getByLabel(/^Parol$|^Password$|^Пароль$/),
    })
    .first();
  await page.getByLabel(/Email/i).fill(user.email);
  await page.getByLabel(/^Parol$|^Password$|^Пароль$/).fill(user.password);
  await signInForm.getByRole('button', { name: /Kirish|Sign in|Войти/ }).click();
}

export async function openDesktopProfileMenu(page: Page) {
  const profileButton = page.locator('button').filter({ has: page.locator('img, span') }).nth(0);
  await profileButton.click();
}

export async function logoutUser(page: Page) {
  await gotoRoute(page, '/profile');
  await page.getByRole('button', { name: /Chiqish|Log Out|Выйти/i }).click().catch(() => null);

  if (page.url().includes('/profile')) {
    const avatarTrigger = page.locator('button[aria-haspopup="menu"]').first();

    if (await avatarTrigger.count()) {
      await avatarTrigger.click();
      await page.getByRole('menuitem', { name: /Chiqish|Log Out|Выйти/i }).click();
    }
  }
}

export async function deleteCurrentSessionUser(page: Page) {
  return page.evaluate(async () => {
    const token = window.localStorage.getItem('marketnest-auth-token');

    if (!token) {
      return { ok: true, skipped: true };
    }

    const response = await fetch('/api/backend/auth/me', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json().catch(() => ({}));
    return {
      ok: response.ok,
      status: response.status,
      message: typeof data.message === 'string' ? data.message : '',
    };
  });
}

export async function fetchAdIdByTitle(page: Page, title: string) {
  const result = await page.evaluate(async (searchTitle) => {
    const response = await fetch(
      `/api/backend/ads?search=${encodeURIComponent(searchTitle)}&fields=card&status=active&limit=20`,
      {
        cache: 'no-store',
      }
    );

    const data = await response.json().catch(() => ({}));
    const ads = Array.isArray(data.ads) ? data.ads : [];
    const ad = ads.find((item: { title?: unknown; id?: string }) => {
      const value = item?.title;

      if (typeof value === 'string') {
        return value.includes(searchTitle);
      }

      return false;
    });

    return ad?.id || '';
  }, title);

  expect(result).not.toBe('');
  return result;
}
