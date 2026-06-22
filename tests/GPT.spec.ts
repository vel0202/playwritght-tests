import { test, expect } from '@playwright/test';

test.describe('Playwright.dev - Полное тестирование', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://playwright.dev/');
  });

  // ============================================
  // 1. МЕТРИКИ ПРОИЗВОДИТЕЛЬНОСТИ
  // ============================================
  test('Сбор основных метрик производительности', async ({ page }) => {
    const metrics = await page.evaluate(() => {
      // 👇 Уточняем тип для навигационных данных
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      if (!perfData) {
        return {
          error: 'Нет данных о навигации',
          domContentLoaded: 0,
          loadTime: 0,
          totalTime: 0,
          domInteractive: 0,
          redirectTime: 0,
          dnsLookup: 0,
          tcpConnect: 0,
          requestTime: 0,
          resources: 0,
          totalSize: 0,
          requests: 0,
          slowestResource: 'Нет данных',
        };
      }

      // 👇 Уточняем тип для ресурсов
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

      return {
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
        loadTime: perfData.loadEventEnd - perfData.loadEventStart,
        totalTime: perfData.loadEventEnd - perfData.fetchStart,
        domInteractive: perfData.domInteractive - perfData.fetchStart,
        redirectTime: perfData.redirectEnd - perfData.redirectStart,
        dnsLookup: perfData.domainLookupEnd - perfData.domainLookupStart,
        tcpConnect: perfData.connectEnd - perfData.connectStart,
        requestTime: perfData.responseEnd - perfData.requestStart,
        resources: resources.length,
        totalSize: resources.reduce((acc, res) => acc + (res.transferSize || 0), 0),
        requests: resources.length,
        slowestResource: resources.sort((a, b) => b.duration - a.duration)[0]?.name || 'Нет',
      };
    });

    if (metrics.error) {
      console.error('❌ Ошибка при сборе метрик:', metrics.error);
      return;
    }

    console.log('📊 Метрики производительности:');
    console.log(`- DOM Content Loaded: ${metrics.domContentLoaded.toFixed(2)}ms`);
    console.log(`- Полная загрузка: ${metrics.loadTime.toFixed(2)}ms`);
    console.log(`- Общее время: ${metrics.totalTime.toFixed(2)}ms`);
    console.log(`- DOM Interactive: ${metrics.domInteractive.toFixed(2)}ms`);
    console.log(`- DNS Lookup: ${metrics.dnsLookup.toFixed(2)}ms`);
    console.log(`- TCP Connect: ${metrics.tcpConnect.toFixed(2)}ms`);
    console.log(`- Запросы: ${metrics.requests}`);
    console.log(`- Размер: ${(metrics.totalSize / 1024).toFixed(2)}KB`);
    console.log(`- Самый медленный ресурс: ${metrics.slowestResource}`);

    expect(metrics.totalTime).toBeLessThan(5000);
    expect(metrics.domContentLoaded).toBeLessThan(2000);
  });

  // ============================================
  // 2. МЕТРИКИ ДОСТУПНОСТИ
  // ============================================
  test('Сбор метрик доступности', async ({ page }) => {
    const navigation = {
      logo: page.getByRole('link', { name: 'Playwright logo Playwright' }),
      docs: page.getByRole('link', { name: 'Docs' }),
      api: page.getByRole('link', { name: 'API', exact: true }),
      github: page.getByRole('link', { name: 'GitHub repository' }),
      discord: page.getByRole('link', { name: 'Discord server' }),
      themeToggle: page.getByRole('button', { name: 'Switch between dark and light' }),
      search: page.getByRole('button', { name: 'Search (Control+k)' }),
    };

    // 👇 Явно указываем тип для объекта visibility
    const visibility: Record<string, boolean> = {};
    for (const [name, element] of Object.entries(navigation)) {
      visibility[name] = await element.isVisible();
      console.log(`- ${name}: ${visibility[name] ? '✅ Виден' : '❌ Не виден'}`);
    }

    expect(Object.values(visibility).every((v) => v === true)).toBe(true);

    // 👇 Явно указываем тип для массива issues
    const accessibilityIssues: string[] = await page.evaluate(() => {
      const issues: string[] = [];
      document.querySelectorAll('img').forEach((img) => {
        if (!img.alt || img.alt.trim() === '') {
          issues.push(`Изображение без alt: ${img.src}`);
        }
      });
      document.querySelectorAll('input').forEach((input) => {
        if (!input.getAttribute('aria-label') && !input.id) {
          issues.push(`Инпут без label: ${input.type}`);
        }
      });
      return issues;
    });

    console.log('♿ Проблемы доступности:', accessibilityIssues.length || 'Нет');
    expect(accessibilityIssues.length).toBe(0);
  });

  // ============================================
  // 3. ПУТЕШЕСТВИЕ ПО САЙТУ
  // ============================================
  test('Путешествие пользователя по сайту', async ({ page }) => {
    await expect(page).toHaveTitle(/Playwright/);

    const mainHeading = page.getByRole('heading', {
      name: 'Playwright enables reliable web automation for testing, scripting, and AI agents.',
    });
    await expect(mainHeading).toBeVisible();

    const themeToggle = page.getByRole('button', { name: 'Switch between dark and light' });
    await themeToggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await page.getByRole('link', { name: 'Get started' }).click();
    await expect(page).toHaveURL(/.*docs\/intro/);
    await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();

    const codeBlock = page.locator('pre:has-text("npm init playwright@latest")');
    await expect(codeBlock).toBeVisible();

    await page.getByRole('link', { name: 'API', exact: true }).click();
    await expect(page).toHaveURL(/.*api/);

    const searchButton = page.getByRole('button', { name: 'Search (Control+k)' });
    await searchButton.click();

    const searchInput = page.locator('.DocSearch-Input');
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await searchInput.fill('locator');

    await page.waitForSelector('.DocSearch-Hit', { timeout: 5000 });
    const hits = page.locator('.DocSearch-Hit');
    await expect(hits.first()).toBeVisible({ timeout: 3000 });

    await page.keyboard.press('Escape');

    await page.getByRole('link', { name: 'Playwright logo Playwright' }).click();
    await expect(page).toHaveURL('https://playwright.dev/');
  });

  // ============================================
  // 4. МЕТРИКИ РЕСУРСОВ
  // ============================================
  test('Метрики загрузки ресурсов', async ({ page }) => {
    const resources = await page.evaluate(() => {
      return (performance.getEntriesByType('resource') as PerformanceResourceTiming[]).map(
        (entry) => ({
          name: entry.name,
          type: entry.initiatorType,
          size: entry.transferSize || 0,
          duration: entry.duration,
          status: entry.responseStatus || 'unknown',
        }),
      );
    });

    const jsFiles = resources.filter((r) => r.type === 'script');
    const cssFiles = resources.filter((r) => r.type === 'css');
    const images = resources.filter((r) => r.type === 'img');
    const fonts = resources.filter((r) => r.type === 'font');

    // 👇 ИСПРАВЛЕНО: Используем Number() для гарантии числа
    const jsSize = jsFiles.reduce((acc, file) => acc + Number(file.size), 0);
    const cssSize = cssFiles.reduce((acc, file) => acc + Number(file.size), 0);

    console.log('📦 Статистика ресурсов:');
    console.log(`- JS файлов: ${jsFiles.length}, общий размер: ${(jsSize / 1024).toFixed(2)}KB`);
    console.log(`- CSS файлов: ${cssFiles.length}, общий размер: ${(cssSize / 1024).toFixed(2)}KB`);
    console.log(`- Изображений: ${images.length}`);
    console.log(`- Шрифтов: ${fonts.length}`);

    const slowResources = resources.filter((r) => r.duration > 500);
    if (slowResources.length > 0) {
      console.log('🐌 Медленные ресурсы (>500ms):');
      slowResources.forEach((r) => {
        console.log(`  - ${r.name.split('/').pop()} (${r.duration.toFixed(0)}ms)`);
      });
    }

    const failedResources = resources.filter((r) => r.status >= 400);
    expect(failedResources.length).toBe(0);
  });

  // ============================================
  // 5. АДАПТИВНОСТЬ (MOBILE)
  // ============================================
  test('Тестирование адаптивности (mobile viewport)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('https://playwright.dev/');

    const mobileMenuButton = page.locator('.navbar__toggle');
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
      console.log('📱 Меню открыто');

      const closeButton = page.getByRole('button', { name: 'Close navigation bar' });
      await closeButton.click();
      console.log('✅ Меню закрыто через крестик');
    }

    const title = page.getByRole('heading', { name: 'Playwright enables reliable' });
    await expect(title).toBeVisible();

    const getStarted = page.getByRole('link', { name: 'Get started' });
    await expect(getStarted).toBeVisible();

    await getStarted.click();
    await expect(page).toHaveURL(/.*docs\/intro/);
  });

  // ============================================
  // 6. ВИЗУАЛЬНЫЙ РЕГРЕСС (СКРИНШОТЫ)
  // ============================================
  test('Скриншотный тест (визуальный регресс)', async ({ page }) => {
    await expect(page).toHaveScreenshot('homepage.png', {
      maxDiffPixels: 100,
      maxDiffPixelRatio: 0.1,
    });

    const themeToggle = page.getByRole('button', { name: 'Switch between dark and light' });
    await themeToggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await expect(page).toHaveScreenshot('homepage-light.png', {
      maxDiffPixels: 100,
      maxDiffPixelRatio: 0.1,
    });
  });

  // ============================================
  // 7. CORE WEB VITALS
  // ============================================
  test('Метрики Core Web Vitals', async ({ page }) => {
    test.setTimeout(60000);

    await page.waitForLoadState('networkidle');

    // 👇 Уточняем типы и возвращаемое значение
    const vitals = await page.evaluate(() => {
      return new Promise<{
        lcp: number;
        fcp: number;
        ttfb: number;
        domInteractive: number;
      }>((resolve) => {
        const paintEntries = performance.getEntriesByType('paint');
        const fcp = paintEntries.find((entry) => entry.name === 'first-contentful-paint');
        const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
        const lcp = lcpEntries[lcpEntries.length - 1];
        const navEntry = performance.getEntriesByType(
          'navigation',
        )[0] as PerformanceNavigationTiming;

        resolve({
          lcp: lcp ? lcp.startTime : 0,
          fcp: fcp ? fcp.startTime : 0,
          ttfb: navEntry ? navEntry.responseStart : 0,
          domInteractive: navEntry ? navEntry.domInteractive - navEntry.fetchStart : 0,
        });
      });
    });

    console.log('⚡ Core Web Vitals:');
    console.log(`- LCP (Largest Contentful Paint): ${vitals.lcp.toFixed(2)}ms`);
    console.log(`- FCP (First Contentful Paint): ${vitals.fcp.toFixed(2)}ms`);
    console.log(`- TTFB (Time to First Byte): ${vitals.ttfb.toFixed(2)}ms`);
    console.log(`- DOM Interactive: ${vitals.domInteractive.toFixed(2)}ms`);

    expect(vitals.lcp).toBeLessThan(4000);
    expect(vitals.fcp).toBeLessThan(3000);
    expect(vitals.ttfb).toBeLessThan(800);
  });
});
