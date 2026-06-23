import { test, expect } from '@playwright/test';

test.describe('Тестирование сайта ВТ2Б', () => {
  test('Полный сценарий', async ({ page }) => {
    await test.step('Переход на сайт и согласие с куки', async () => {
      await page.goto('https://vt2b.ru/');
      await page.getByRole('link', { name: 'СОГЛАСИТЬСЯ' }).click();
      await expect(page.getByRole('link', { name: 'Группа компаний «ВТ2Б»' })).toBeVisible();
      console.log('✅ Главная страница загружена, куки приняты');
    });
    await test.step('Переход в раздел Вакансии', async () => {
      await page.getByRole('link', { name: 'Вакансии' }).click();
      console.log('✅ Страница вакансий открыта');
    });
    await test.step('Отклик на вакансию и заполнение формы', async () => {
      await page.getByRole('link', { name: 'Откликнуться на вакансию' }).first().click();

      const nameField = page.getByRole('textbox', { name: 'Имя' });
      await nameField.click();
      await nameField.fill('123');

      const phoneField = page.getByRole('textbox', { name: 'Телефон' });
      await phoneField.click();
      await phoneField.fill('123');

      const emailField = page.getByRole('textbox', { name: 'Email' });
      await emailField.click();
      await emailField.fill('123');

      await page.getByText('x', { exact: true }).click();
      console.log('✅ Форма отклика заполнена и закрыта');
    });
    await test.step('Возврат на главную страницу', async () => {
      await page.getByRole('link', { name: 'Группа компаний «ВТ2Б»' }).click();
      await expect(page.getByRole('link', { name: 'Вакансии' })).toBeVisible();
      console.log('✅ Возврат на главную выполнен');
    });
    await test.step('Наведение на "Документы" и переход в "Политику конфиденциальности"', async () => {
      await page.getByText('Документы').hover();
      await page.waitForTimeout(3000); // пауза для анимации

      const policyLink = page
        .locator('#navbarSupportedContent')
        .getByRole('link', { name: 'Политика конфиденциальности' });

      await expect(policyLink).toBeVisible();
      await policyLink.click();
      console.log('✅ Страница "Политика конфиденциальности" открыта');
    });
    await test.step('Проверка заголовка "Политика конфиденциальности"', async () => {
      await expect(
        page.getByRole('strong').filter({ hasText: 'Политика конфиденциальности' }),
      ).toBeVisible();
      console.log('✅ Заголовок страницы подтверждён');
    });

    await test.step('Финальный возврат на главную страницу', async () => {
      await page.getByRole('link', { name: 'Группа компаний «ВТ2Б»' }).click();
      console.log('✅ Тест успешно завершён!');
    });
  });
});
