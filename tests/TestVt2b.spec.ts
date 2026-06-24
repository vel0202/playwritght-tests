import { test, expect } from '@playwright/test';

test.describe('Тестирование сайта ВТ2Б', () => {
  test('Полный сценарий', async ({ page }) => {
    // Объект для хранения метрик
    const metrics: { [stepName: string]: number } = {};
    const startTotal = Date.now();

    // Вспомогательная функция для замера шага
    async function measureStep<T>(name: string, fn: () => Promise<T>): Promise<T> {
      const start = Date.now();
      try {
        const result = await fn();
        const duration = Date.now() - start;
        metrics[name] = duration;
        console.log(`⏱️ Шаг "${name}" выполнен за ${duration} мс`);
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        metrics[name] = duration;
        console.error(`❌ Шаг "${name}" упал после ${duration} мс`, error);
        throw error;
      }
    }

    await measureStep('Переход на сайт и согласие с куки', async () => {
      await page.goto('https://vt2b.ru/');
      await page.getByRole('link', { name: 'СОГЛАСИТЬСЯ' }).click();
      await expect(page.getByRole('link', { name: 'Группа компаний «ВТ2Б»' })).toBeVisible();
      console.log('✅ Главная страница загружена, куки приняты');
    });

    await measureStep('Переход в раздел Вакансии', async () => {
      await page.getByRole('link', { name: 'Вакансии' }).click();
      console.log('✅ Страница вакансий открыта');
    });

    await measureStep('Отклик на вакансию и заполнение формы', async () => {
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

    await measureStep('Возврат на главную страницу', async () => {
      await page.getByRole('link', { name: 'Группа компаний «ВТ2Б»' }).click();
      await expect(page.getByRole('link', { name: 'Вакансии' })).toBeVisible();
      console.log('✅ Возврат на главную выполнен');
    });

    await measureStep(
      'Наведение на "Документы" и переход в "Политику конфиденциальности"',
      async () => {
        await page.getByText('Документы').hover();
        await page.waitForTimeout(3000); // пауза для анимации

        const policyLink = page
          .locator('#navbarSupportedContent')
          .getByRole('link', { name: 'Политика конфиденциальности' });

        await expect(policyLink).toBeVisible();
        await policyLink.click();
        console.log('✅ Страница "Политика конфиденциальности" открыта');
      },
    );

    await measureStep('Проверка заголовка "Политика конфиденциальности"', async () => {
      await expect(
        page.getByRole('strong').filter({ hasText: 'Политика конфиденциальности' }),
      ).toBeVisible();
      console.log('✅ Заголовок страницы подтверждён');
    });

    await measureStep('Финальный возврат на главную страницу', async () => {
      await page.getByRole('link', { name: 'Группа компаний «ВТ2Б»' }).click();
      console.log('✅ Тест успешно завершён!');
    });

    // Итоговая сводка
    const totalDuration = Date.now() - startTotal;
    console.log('\n📊 Сводка метрик:');
    console.log(`Общее время теста: ${totalDuration} мс`);
    console.log('Время по шагам:');
    for (const [name, duration] of Object.entries(metrics)) {
      console.log(`  ${name}: ${duration} мс`);
    }
  });
});
