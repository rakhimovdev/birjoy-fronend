# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-listing-regression.spec.ts >> auth and listing regression >> auto listing editor exposes vehicle-specific fields
- Location: tests/e2e/auth-listing-regression.spec.ts:153:7

# Error details

```
TimeoutError: page.waitForURL: Timeout 20000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - navigation [ref=e3]:
      - generic [ref=e5]:
        - generic [ref=e6]:
          - generic [ref=e7]:
            - button "Navigatsiyani ochish" [ref=e9]:
              - img [ref=e10]
            - link "BirJoy mark BirJoy" [ref=e11] [cursor=pointer]:
              - /url: /
              - generic [ref=e12]:
                - img "BirJoy mark" [ref=e13]
                - generic [ref=e19]: BirJoy
          - generic [ref=e20]:
            - link "Qidirish" [ref=e21] [cursor=pointer]:
              - /url: /search
              - button "Qidirish" [ref=e22]:
                - img [ref=e23]
                - text: Qidirish
            - generic [ref=e26]:
              - combobox [ref=e27]:
                - img [ref=e28]
              - combobox [ref=e30]
            - button "Tungi rejimga o'tish" [ref=e31]:
              - img [ref=e32]
              - img [ref=e38]
              - text: Mavzu
            - link "E'lon berish" [ref=e40] [cursor=pointer]:
              - /url: /sign-in?redirect=%2Fads%2Fcreate
              - button "E'lon berish" [ref=e41]:
                - img [ref=e42]
                - text: E'lon berish
        - region "Marketplace verticals" [ref=e44]:
          - generic [ref=e46]:
            - link "Uy-joy" [ref=e47] [cursor=pointer]:
              - /url: /uy-joy
              - img [ref=e49]
              - text: Uy-joy
            - link "Avtomobil" [ref=e53] [cursor=pointer]:
              - /url: /avtomobil
              - img [ref=e55]
              - text: Avtomobil
            - link "Market" [ref=e58] [cursor=pointer]:
              - /url: /market
              - img [ref=e60]
              - text: Market
            - link "Taomlar" [ref=e66] [cursor=pointer]:
              - /url: /taomlar
              - img [ref=e68]
              - text: Taomlar
    - main [ref=e73]:
      - generic [ref=e74]:
        - generic [ref=e75]:
          - generic [ref=e76]:
            - img "BirJoy mark" [ref=e77]
            - generic [ref=e82]:
              - generic [ref=e83]: BirJoy
              - generic [ref=e84]: Hammasi bir joyda
          - generic [ref=e85]:
            - img [ref=e86]
            - text: Xavfsiz kirish
          - heading "Akkauntingizga kiring" [level=1] [ref=e89]
          - paragraph [ref=e90]: Saqlanganlar, profil va e'lonlaringizni boshqarish uchun tizimga kiring.
          - generic [ref=e91]:
            - generic [ref=e92]: Ro'yxatdan o'tgach, tizim sizni darhol akkauntga kiritadi.
            - generic [ref=e93]: Saqlanganlar, profil va e'lon berish auth holatiga qarab ishlaydi.
        - generic [ref=e94]:
          - generic [ref=e95]:
            - generic [ref=e96]: Xavfsiz kirish
            - generic [ref=e97]: Akkauntingizga kiring
            - generic [ref=e98]: Saqlanganlar, profil va e'lonlaringizni boshqarish uchun tizimga kiring.
          - generic [ref=e99]:
            - generic [ref=e100]:
              - generic [ref=e101]: yoki
              - button "Google bilan davom etish" [disabled] [ref=e104]:
                - img [ref=e105]
                - text: Google bilan davom etish
            - button "Yandex bilan davom etish" [disabled] [ref=e107]:
              - img [ref=e108]
              - text: Yandex bilan davom etish
            - generic [ref=e110]:
              - generic [ref=e111]:
                - text: Email
                - textbox "Email" [ref=e112]:
                  - /placeholder: you@example.com
              - generic [ref=e113]:
                - text: Parol
                - generic [ref=e114]:
                  - textbox "Parol" [ref=e115]:
                    - /placeholder: Kamida 6 ta belgi
                  - button "Parolni ko'rsatish" [ref=e116]:
                    - img [ref=e117]
              - button "Kirish" [ref=e120]:
                - img [ref=e121]
                - text: Kirish
            - generic [ref=e124]:
              - text: Avval ro'yxatdan o'tib, keyin shu sahifadan kirishingiz mumkin.
              - link "Ro'yxatdan o'tish" [ref=e125] [cursor=pointer]:
                - /url: /sign-up
            - paragraph [ref=e126]:
              - text: Akkauntingiz yo'qmi?
              - link "Ro'yxatdan o'tish" [ref=e127] [cursor=pointer]:
                - /url: /sign-up
  - region "Notifications (F8)":
    - list
```

# Test source

```ts
  60  |       .filter({
  61  |         has: page.getByLabel(/Parolni tasdiqlang|Confirm password|Подтвердите пароль/),
  62  |       })
  63  |       .first();
  64  | 
  65  |     const passwordInput = page.getByLabel(/^Parol$|^Password$|^Пароль$/);
  66  |     const confirmPasswordInput = page.getByLabel(
  67  |       /Parolni tasdiqlang|Confirm password|Подтвердите пароль/
  68  |     );
  69  |     const toggleButtons = page.getByRole('button', {
  70  |       name: /Parolni ko['‘]rsatish|Parolni yashirish|Show password|Hide password|Показать пароль|Скрыть пароль/,
  71  |     });
  72  | 
  73  |     await expect(toggleButtons.first()).toBeVisible();
  74  |     await toggleButtons.first().click();
  75  |     await expect(passwordInput).toHaveAttribute('type', 'text');
  76  |     await toggleButtons.first().click();
  77  |     await expect(passwordInput).toHaveAttribute('type', 'password');
  78  | 
  79  |     await page.getByLabel(/Ism|Name|Имя/).fill(qaUser.name);
  80  |     await page.getByLabel(/Email/i).fill(qaUser.email);
  81  |     await page.getByLabel(/Telefon|Phone|Телефон/).fill(qaUser.phone);
  82  |     await page.getByLabel(/Joylashuv|Location|Локация/).fill(qaUser.location);
  83  |     await passwordInput.fill('short');
  84  |     await confirmPasswordInput.fill('different');
  85  |     await signUpForm
  86  |       .getByRole('button', { name: /Ro'yxatdan o'tish|Sign up|Зарегистрироваться/i })
  87  |       .click();
  88  | 
  89  |     await expect(
  90  |       page
  91  |         .getByText(/Parol juda qisqa|Password is too short|Пароль слишком короткий/)
  92  |         .first()
  93  |     ).toBeVisible();
  94  | 
  95  |     await passwordInput.fill(qaUser.password);
  96  |     await confirmPasswordInput.fill(qaUser.password);
  97  | 
  98  |     const agreementCheckbox = page.getByRole('checkbox');
  99  |     await expect(agreementCheckbox).toBeVisible();
  100 |     await signUpForm
  101 |       .getByRole('button', { name: /Ro'yxatdan o'tish|Sign up|Зарегистрироваться/i })
  102 |       .click();
  103 |     await expect(
  104 |       page.getByText(/Foydalanish shartlari|Shartlarga rozilik|Terms|условиями/i).first()
  105 |     ).toBeVisible();
  106 | 
  107 |     await agreementCheckbox.check();
  108 |     await signUpForm
  109 |       .getByRole('button', { name: /Ro'yxatdan o'tish|Sign up|Зарегистрироваться/i })
  110 |       .click();
  111 | 
  112 |     await page.waitForURL(/\/profile/, { timeout: 20_000 });
  113 |   });
  114 | 
  115 |   test('duplicate registration rules reject reused email and phone', async ({ page }) => {
  116 |     if (isLocalRun) {
  117 |       test.slow();
  118 |     }
  119 | 
  120 |     await gotoRoute(page, '/sign-up');
  121 |     const signUpForm = page
  122 |       .locator('form')
  123 |       .filter({
  124 |         has: page.getByLabel(/Parolni tasdiqlang|Confirm password|Подтвердите пароль/),
  125 |       })
  126 |       .first();
  127 | 
  128 |     await page.getByLabel(/Ism|Name|Имя/).fill(`${qaUser.name} duplicate email`);
  129 |     await page.getByLabel(/Email/i).fill(qaUser.email);
  130 |     await page.getByLabel(/Telefon|Phone|Телефон/).fill(`+9989${Math.floor(200000000 + Math.random() * 699999999)}`.slice(0, 13));
  131 |     await page.getByLabel(/Joylashuv|Location|Локация/).fill(qaUser.location);
  132 |     await page.getByLabel(/^Parol$|^Password$|^Пароль$/).fill(qaUser.password);
  133 |     await page
  134 |       .getByLabel(/Parolni tasdiqlang|Confirm password|Подтвердите пароль/)
  135 |       .fill(qaUser.password);
  136 |     await page.getByRole('checkbox').check();
  137 |     await signUpForm
  138 |       .getByRole('button', { name: /Ro'yxatdan o'tish|Sign up|Зарегистрироваться/i })
  139 |       .click();
  140 |     await expect(page.getByText(/email band|email already exists|email already/i).first()).toBeVisible();
  141 | 
  142 |     await page.getByLabel(/Ism|Name|Имя/).fill(`${qaUser.name} duplicate phone`);
  143 |     await page.getByLabel(/Email/i).fill(`duplicate-phone.${Date.now()}@example.com`);
  144 |     await page.getByLabel(/Telefon|Phone|Телефон/).fill(qaUser.phone);
  145 |     await signUpForm
  146 |       .getByRole('button', { name: /Ro'yxatdan o'tish|Register|Регистрация/ })
  147 |       .click();
  148 |     await expect(
  149 |       page.getByText(/telefon.*mavjud|phone.*already exists|phone.*already in use/i).first()
  150 |     ).toBeVisible();
  151 |   });
  152 | 
  153 |   test('auto listing editor exposes vehicle-specific fields', async ({ page }) => {
  154 |     if (isLocalRun) {
  155 |       test.slow();
  156 |     }
  157 | 
  158 |     await signInWithQaUser(page, qaUser);
  159 |     await waitForPageSettled(page);
> 160 |     await page.waitForURL(/\/profile/, { timeout: 20_000 });
      |                ^ TimeoutError: page.waitForURL: Timeout 20000ms exceeded.
  161 | 
  162 |     await gotoRoute(page, '/ads/create?vertical=auto');
  163 |     await expect(page.getByLabel(/Fuel|Yonilg|Топливо/i).first()).toBeVisible();
  164 |     await expect(page.getByLabel(/Year|Yil|Год/i).first()).toBeVisible();
  165 |     await expect(page.getByLabel(/Transmission|Korobka|Uzatish/i).first()).toBeVisible();
  166 |   });
  167 | 
  168 |   test('login, search, favorites, create, edit, and delete listing flows work', async ({ page }) => {
  169 |     if (isLocalRun) {
  170 |       test.slow();
  171 |     }
  172 | 
  173 |     await signInWithQaUser(page, qaUser);
  174 |     await waitForPageSettled(page);
  175 |     await page.waitForURL(/\/profile/, { timeout: 20_000 });
  176 | 
  177 |     await gotoRoute(page, '/uy-joy');
  178 |     const searchbox = page.getByRole('searchbox').first();
  179 |     await searchbox.fill('Toshkent');
  180 |     await searchbox.press('Enter');
  181 |     await expect(page).toHaveURL(/[\?&]q=Toshkent/);
  182 | 
  183 |     await gotoRoute(page, '/ads/create?vertical=market');
  184 | 
  185 |     createdAdTitle = `[QA TEST] Market Listing ${Date.now()}`;
  186 | 
  187 |     await page.getByLabel(/Sarlavha|Title|Заголовок/).fill(createdAdTitle);
  188 | 
  189 |     await page.locator('#condition').click();
  190 |     await page.getByRole('option', { name: /Yangi|New|Новый/ }).click();
  191 | 
  192 |     await page.getByLabel(/Narx|Price|Цена/).fill('123');
  193 |     await page.getByLabel(/Tavsif|Description|Описание/).fill(
  194 |       'QA regression listing created by Playwright.'
  195 |     );
  196 |     await page.getByLabel(/Joylashuv|Location|Локация/).fill('Toshkent');
  197 |     await page.getByLabel(/Telefon|Phone|Телефон/).fill(qaUser.phone);
  198 | 
  199 |     await page.getByRole('button', { name: /E’lonni chop etish|Publish Listing|Опубликовать/i }).click();
  200 |     await page.waitForURL(/\/market/, { timeout: 20_000 });
  201 | 
  202 |     createdAdId = await fetchAdIdByTitle(page, createdAdTitle);
  203 |     await gotoRoute(page, `/ads/${createdAdId}`);
  204 |     await expect(
  205 |       page.getByRole('heading', { name: new RegExp(escapeRegExp(createdAdTitle)) })
  206 |     ).toBeVisible();
  207 | 
  208 |     const favoriteButton = page.getByRole('button', { name: /Saqlanganlar|Favorites|Избранное/ }).first();
  209 |     await favoriteButton.click();
  210 |     await expect(
  211 |       page.getByText(/Saqlanganlarga qo'shildi|Added to favorites|Добавлено в избранное/).first()
  212 |     ).toBeVisible();
  213 | 
  214 |     await gotoRoute(page, '/favorites');
  215 |     await expect(page.getByText(createdAdTitle)).toBeVisible();
  216 | 
  217 |     await gotoRoute(page, `/ads/${createdAdId}/edit`);
  218 |     createdAdTitle = `${createdAdTitle} Updated`;
  219 |     await page.getByLabel(/Sarlavha|Title|Заголовок/).fill(createdAdTitle);
  220 |     await page.getByRole('button', { name: /O‘zgarishlarni saqlash|Save Changes|Сохранить изменения/ }).click();
  221 |     await page.waitForURL(new RegExp(`/ads/${createdAdId}$`), { timeout: 20_000 });
  222 |     await expect(
  223 |       page.getByRole('heading', { name: new RegExp(escapeRegExp(createdAdTitle)) })
  224 |     ).toBeVisible();
  225 | 
  226 |     await page.getByRole('button', { name: /O‘chirish|Delete|Удалить/ }).first().click();
  227 |     await page.getByRole('button', { name: /^O‘chirish$|^Delete$|^Удалить$/ }).last().click();
  228 |     await page.waitForURL(/\/market/, { timeout: 20_000 });
  229 | 
  230 |     await gotoRoute(page, `/ads/${createdAdId}`);
  231 |     await expect(
  232 |       page.getByText(/Eʼlon topilmadi|Listing not found|Объявление не найдено/).first()
  233 |     ).toBeVisible();
  234 |   });
  235 | });
  236 | 
```