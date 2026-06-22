import { test, expect } from '@playwright/test';

test.describe('Проверка главной страницы', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://playwright.dev/');
  });
  test('Проверка отображения элементов навигации', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Playwright logo Playwright' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Docs' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'MCP', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'CLI', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'API' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Node.js' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'GitHub repository' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Discord server' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Switch between dark and light' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Search (Control+k)' })).toBeVisible();
  });

  test('Проверка названия элементов навигации', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Playwright logo Playwright' })).toContainText(
      'Playwright',
    );
    await expect(page.getByRole('link', { name: 'Docs' })).toContainText('Docs');
    await expect(page.getByRole('link', { name: 'MCP', exact: true })).toContainText('MCP');
    await expect(page.getByRole('link', { name: 'CLI', exact: true })).toContainText('CLI');
    await expect(page.getByRole('link', { name: 'API' })).toContainText('API');
    await expect(page.getByRole('button', { name: 'Node.js' })).toContainText('Node.js');
  });

  test('Проверка атрибутов hrev элементов навигации', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Playwright logo Playwright' })).toHaveAttribute(
      'href',
      '/',
    );
    await expect(page.getByRole('link', { name: 'Docs' })).toHaveAttribute('href', '/docs/intro');
    await expect(page.getByRole('link', { name: 'MCP', exact: true })).toHaveAttribute(
      'href',
      '/mcp/introduction',
    );
    await expect(page.getByRole('link', { name: 'CLI', exact: true })).toHaveAttribute(
      'href',
      '/agent-cli/introduction',
    );
    await expect(page.getByRole('link', { name: 'API' })).toHaveAttribute(
      'href',
      '/docs/api/class-playwright',
    );
    await expect(page.getByRole('link', { name: 'GitHub repository' })).toHaveAttribute(
      'href',
      'https://github.com/microsoft/playwright',
    );
    await expect(page.getByRole('link', { name: 'Discord server' })).toHaveAttribute(
      'href',
      'https://aka.ms/playwright/discord',
    );
  });

  test('Проверка переключения темы', async ({ page }) => {
    await page.getByRole('button', { name: 'Switch between dark and light' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.getByRole('button', { name: 'Switch between dark and light' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('Проверка заголовков', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Playwright enables reliable' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Playwright enables reliable' })).toContainText(
      'Playwright enables reliable web automation for testing, scripting, and AI agents.',
    );
    await expect(page.getByText('One API to drive Chromium,')).toBeVisible();
    await expect(page.getByText('One API to drive Chromium,')).toContainText(
      'One API to drive Chromium, Firefox, and WebKit — in your tests, your scripts, and your agent workflows. Available for TypeScript, Python, .NET, and Java.',
    );
  });

  test('Побегаем по странице', async ({ page }) => {
    // Увеличиваем таймаут для всего теста
    test.setTimeout(60000);

    // 👇 Добавляем await перед каждым test.step()
    await test.step('Меняем тему', async () => {
      await page.getByRole('button', { name: 'Switch between dark and light' }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
      await page.getByRole('button', { name: 'Switch between dark and light' }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    });

    await test.step('Переходим в раздел Get Started', async () => {
      await page.getByRole('link', { name: 'Get started' }).click();

      const heading = page.getByRole('heading', { name: 'Installation' });
      await expect(heading).toBeVisible({ timeout: 10000 });
      await expect(heading).toContainText('Installation');
    });

    await test.step('Переходим в раздел VS Code', async () => {
      await page.getByRole('link', { name: 'VS Code', exact: true }).click();
      await page.waitForLoadState('domcontentloaded');

      const heading = page.getByRole('heading', { name: 'VS Code' });
      await expect(heading).toBeVisible({ timeout: 10000 });
      await expect(heading).toContainText('VS Code');
    });

    await test.step('Переходим на главную страницу обратно', async () => {
      await page.getByRole('link', { name: 'Playwright logo Playwright' }).click();
      await expect(page).toHaveURL('https://playwright.dev/');
    });
  });
});
