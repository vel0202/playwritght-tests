import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://vt2b.ru/');
  await page.getByRole('link', { name: 'СОГЛАСИТЬСЯ' }).click();
  await expect(page.getByRole('link', { name: 'Группа компаний «ВТ2Б»' })).toBeVisible();
  await page.getByRole('link', { name: 'Вакансии' }).click();
  await page.getByRole('link', { name: 'Откликнуться на вакансию' }).first().click();
  await page.getByRole('textbox', { name: 'Имя' }).click();
  await page.getByRole('textbox', { name: 'Имя' }).fill('123');
  await page.getByRole('textbox', { name: 'Телефон' }).click();
  await page.getByRole('textbox', { name: 'Телефон' }).fill('123');
  await page.getByRole('textbox', { name: 'Email' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill('123');
  await page.getByText('x', { exact: true }).click();
  await page.getByRole('link', { name: 'Группа компаний «ВТ2Б»' }).click();
  await expect(page.getByRole('link', { name: 'Вакансии' })).toBeVisible();
  await page.getByText('Документы').click();
  await page
    .locator('#navbarSupportedContent')
    .getByRole('link', { name: 'Политика конфиденциальности' })
    .click();
  await expect(
    page.getByRole('strong').filter({ hasText: 'Политика конфиденциальности' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Группа компаний «ВТ2Б»' }).click();
});
