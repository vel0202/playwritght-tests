import { test, expect } from '@playwright/test';

// Количество виртуальных пользователей можно задать через переменную окружения USERS
// По умолчанию 10
const USERS_COUNT = parseInt(process.env.USERS || '10', 10);

test.describe.parallel(`Нагрузочный прогон (${USERS_COUNT} пользователей)`, () => {
  for (let i = 0; i < USERS_COUNT; i++) {
    test(`сессия пользователя ${i + 1}`, async ({ browser }) => {
      // Создаём контекст с игнорированием SSL-ошибок
      const context = await browser.newContext({ ignoreHTTPSErrors: true });
      const page = await context.newPage();

      // Засекаем время начала сессии
      const startTime = Date.now();

      // Шаги теста
      await page.goto('https://ogd.ias.ru');

      await page.getByRole('textbox', { name: 'Логин' }).fill('dev1');
      await page.getByRole('textbox', { name: 'Пароль' }).fill('$Demo123456');
      await page.getByRole('button', { name: 'Войти' }).click();

      await expect(page.getByText('ГИСОГД Оренбургской области')).toBeVisible({ timeout: 30000 });

      await page
        .getByRole('cell', { name: 'Ресурсоснабжающие организации' })
        .locator('img')
        .click();
      await expect(page.getByText(' В работе запросы ТУ ')).toBeVisible();

      await page.getByPlaceholder('номер, дата, наименование').fill('102');
      await page.locator('#fullsearchfield-1020-trigger-search').click();
      await page.locator('#button-1005').click();

      // Засекаем время окончания
      const duration = Date.now() - startTime;
      console.log(`Сессия ${i + 1} завершена за ${duration} мс`);

      // Закрываем контекст (браузер закроется автоматически после теста)
      await context.close();
    });
  }
});
