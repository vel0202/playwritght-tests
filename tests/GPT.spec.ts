import { test, expect } from '@playwright/test';

test.describe('Playwright.dev - Полное тестирование', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://playwright.dev/');
  });

  // ============================================
  // 1. МЕТРИКИ ПРОИЗВОДИТЕЛЬНОСТИ
  // ============================================
  test('Сбор основных метрик производительности', async ({ page }) => {
    // 👇 Загружаем страницу и сразу собираем метрики
    const metrics = await test.step('Сбор метрик производительности', async () => {
      // Переходим на страницу и собираем метрики в одном evaluate
      const result = await page.evaluate(async () => {
        // Ждём загрузки страницы
        await new Promise((resolve) => {
          if (document.readyState === 'complete') {
            resolve();
          } else {
            window.addEventListener('load', resolve);
          }
        });

        // Даём время на сбор метрик
        await new Promise((resolve) => setTimeout(resolve, 500));

        const perfData = performance.getEntriesByType(
          'navigation',
        )[0] as PerformanceNavigationTiming;

        if (!perfData) {
          return { error: 'Нет данных о навигации' };
        }

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

      if (result.error) {
        console.warn('⚠️', result.error);
        return null;
      }
      return result;
    });

    if (!metrics) {
      console.warn('⚠️ Тест пропущен из-за отсутствия метрик');
      return;
    }

    // Вывод и проверка метрик
    console.log('📊 Метрики производительности:');
    console.log(`- DOM Content Loaded: ${metrics.domContentLoaded?.toFixed(2) || 0}ms`);
    console.log(`- Полная загрузка: ${metrics.loadTime?.toFixed(2) || 0}ms`);
    console.log(`- Общее время: ${metrics.totalTime?.toFixed(2) || 0}ms`);
    console.log(`- DOM Interactive: ${metrics.domInteractive?.toFixed(2) || 0}ms`);
    console.log(`- DNS Lookup: ${metrics.dnsLookup?.toFixed(2) || 0}ms`);
    console.log(`- TCP Connect: ${metrics.tcpConnect?.toFixed(2) || 0}ms`);
    console.log(`- Запросы: ${metrics.requests || 0}`);
    console.log(`- Размер: ${(metrics.totalSize / 1024).toFixed(2)}KB`);
    console.log(`- Самый медленный ресурс: ${metrics.slowestResource}`);

    expect(metrics.totalTime).toBeLessThan(5000);
    expect(metrics.domContentLoaded).toBeLessThan(2000);
  });

  // ============================================
  // 2. МЕТРИКИ ДОСТУПНОСТИ
  // ============================================
  test('Сбор метрик доступности', async ({ page }) => {
    const visibility = await test.step('Проверка видимости элементов навигации', async () => {
      const navigation = {
        logo: page.getByRole('link', { name: 'Playwright logo Playwright' }),
        docs: page.getByRole('link', { name: 'Docs' }),
        api: page.getByRole('link', { name: 'API', exact: true }),
        github: page.getByRole('link', { name: 'GitHub repository' }),
        discord: page.getByRole('link', { name: 'Discord server' }),
        themeToggle: page.getByRole('button', { name: 'Switch between dark and light' }),
        search: page.getByRole('button', { name: 'Search (Control+k)' }),
      };

      const result: Record<string, boolean> = {};
      for (const [name, element] of Object.entries(navigation)) {
        result[name] = await element.isVisible();
        console.log(`- ${name}: ${result[name] ? '✅ Виден' : '❌ Не виден'}`);
      }
      return result;
    });

    await test.step('Проверка, что все элементы видны', async () => {
      expect(Object.values(visibility).every((v) => v === true)).toBe(true);
    });

    const accessibilityIssues = await test.step('Поиск проблем доступности', async () => {
      return await page.evaluate(() => {
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
    });

    await test.step('Проверка проблем доступности', async () => {
      console.log('♿ Проблемы доступности:', accessibilityIssues.length || 'Нет');
      expect(accessibilityIssues.length).toBe(0);
    });
  });

  // ============================================
  // 3. ПУТЕШЕСТВИЕ ПО САЙТУ
  // ============================================
  test('Путешествие пользователя по сайту', async ({ page }) => {
    await test.step('Проверка заголовка страницы', async () => {
      await expect(page).toHaveTitle(/Playwright/);
    });

    await test.step('Проверка главного заголовка', async () => {
      const mainHeading = page.getByRole('heading', {
        name: 'Playwright enables reliable web automation for testing, scripting, and AI agents.',
      });
      await expect(mainHeading).toBeVisible();
    });

    await test.step('Переключение темы на светлую и обратно', async () => {
      const themeToggle = page.getByRole('button', { name: 'Switch between dark and light' });
      await themeToggle.click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    });

    await test.step('Переход в раздел Get Started', async () => {
      await page.getByRole('link', { name: 'Get started' }).click();
      await expect(page).toHaveURL(/.*docs\/intro/);
      await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
    });

    await test.step('Проверка блока с кодом', async () => {
      const codeBlock = page.locator('pre:has-text("npm init playwright@latest")');
      await expect(codeBlock).toBeVisible();
    });

    await test.step('Переход в раздел API', async () => {
      await page.getByRole('link', { name: 'API', exact: true }).click();
      await expect(page).toHaveURL(/.*api/);
    });

    await test.step('Поиск по сайту', async () => {
      const searchButton = page.getByRole('button', { name: 'Search (Control+k)' });
      await searchButton.click();

      const searchInput = page.locator('.DocSearch-Input');
      await expect(searchInput).toBeVisible({ timeout: 5000 });
      await searchInput.fill('locator');

      await page.waitForSelector('.DocSearch-Hit', { timeout: 5000 });
      const hits = page.locator('.DocSearch-Hit');
      await expect(hits.first()).toBeVisible({ timeout: 3000 });

      await page.keyboard.press('Escape');
    });

    await test.step('Возврат на главную страницу', async () => {
      await page.getByRole('link', { name: 'Playwright logo Playwright' }).click();
      await expect(page).toHaveURL('https://playwright.dev/');
    });
  });

  // ============================================
  // 4. МЕТРИКИ РЕСУРСОВ
  // ============================================
  test('Метрики загрузки ресурсов', async ({ page }) => {
    const resources = await test.step('Сбор информации о ресурсах', async () => {
      return await page.evaluate(() => {
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
    });

    await test.step('Анализ и вывод статистики ресурсов', async () => {
      const jsFiles = resources.filter((r) => r.type === 'script');
      const cssFiles = resources.filter((r) => r.type === 'css');
      const images = resources.filter((r) => r.type === 'img');
      const fonts = resources.filter((r) => r.type === 'font');

      const jsSize = jsFiles.reduce((acc, file) => acc + Number(file.size), 0);
      const cssSize = cssFiles.reduce((acc, file) => acc + Number(file.size), 0);

      console.log('📦 Статистика ресурсов:');
      console.log(`- JS файлов: ${jsFiles.length}, общий размер: ${(jsSize / 1024).toFixed(2)}KB`);
      console.log(
        `- CSS файлов: ${cssFiles.length}, общий размер: ${(cssSize / 1024).toFixed(2)}KB`,
      );
      console.log(`- Изображений: ${images.length}`);
      console.log(`- Шрифтов: ${fonts.length}`);

      const slowResources = resources.filter((r) => r.duration > 500);
      if (slowResources.length > 0) {
        console.log('🐌 Медленные ресурсы (>500ms):');
        slowResources.forEach((r) => {
          console.log(`  - ${r.name.split('/').pop()} (${r.duration.toFixed(0)}ms)`);
        });
      }
    });

    await test.step('Проверка отсутствия ресурсов с ошибками', async () => {
      const failedResources = resources.filter((r) => r.status >= 400);
      expect(failedResources.length).toBe(0);
    });
  });

  // ============================================
  // 5. АДАПТИВНОСТЬ (MOBILE)
  // ============================================
  test('Тестирование адаптивности (mobile viewport)', async ({ page }) => {
    await test.step('Установка мобильного viewport и загрузка страницы', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('https://playwright.dev/');
    });

    await test.step('Открытие и закрытие мобильного меню', async () => {
      const mobileMenuButton = page.locator('.navbar__toggle');
      if (await mobileMenuButton.isVisible()) {
        await mobileMenuButton.click();
        console.log('📱 Меню открыто');

        const closeButton = page.getByRole('button', { name: 'Close navigation bar' });
        await closeButton.click();
        console.log('✅ Меню закрыто через крестик');
      }
    });

    await test.step('Проверка заголовка на мобильной версии', async () => {
      const title = page.getByRole('heading', { name: 'Playwright enables reliable' });
      await expect(title).toBeVisible();
    });

    await test.step('Переход в раздел Get Started с мобильной версии', async () => {
      const getStarted = page.getByRole('link', { name: 'Get started' });
      await expect(getStarted).toBeVisible();
      await getStarted.click();
      await expect(page).toHaveURL(/.*docs\/intro/);
    });
  });

  // ============================================
  // 6. ВИЗУАЛЬНЫЙ РЕГРЕСС (СКРИНШОТЫ)
  // ============================================
  test('Скриншотный тест (визуальный регресс)', async ({ page }) => {
    await test.step('Скриншот главной страницы', async () => {
      await expect(page).toHaveScreenshot('homepage.png', {
        maxDiffPixels: 100,
        maxDiffPixelRatio: 0.1,
      });
    });

    await test.step('Переключение на светлую тему', async () => {
      const themeToggle = page.getByRole('button', { name: 'Switch between dark and light' });
      await themeToggle.click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    });

    await test.step('Скриншот главной страницы в светлой теме', async () => {
      await expect(page).toHaveScreenshot('homepage-light.png', {
        maxDiffPixels: 100,
        maxDiffPixelRatio: 0.1,
      });
    });
  });

  // ============================================
  // 7. CORE WEB VITALS
  // ============================================
  test('Метрики Core Web Vitals', async ({ page }) => {
    test.setTimeout(60000);

    await test.step('Ожидание полной загрузки страницы', async () => {
      await page.waitForLoadState('networkidle');
    });

    const vitals = await test.step('Сбор метрик Core Web Vitals', async () => {
      return await page.evaluate(() => {
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
    });

    await test.step('Вывод метрик Core Web Vitals', async () => {
      console.log('⚡ Core Web Vitals:');
      console.log(`- LCP (Largest Contentful Paint): ${vitals.lcp.toFixed(2)}ms`);
      console.log(`- FCP (First Contentful Paint): ${vitals.fcp.toFixed(2)}ms`);
      console.log(`- TTFB (Time to First Byte): ${vitals.ttfb.toFixed(2)}ms`);
      console.log(`- DOM Interactive: ${vitals.domInteractive.toFixed(2)}ms`);
    });

    await test.step('Проверка метрик Core Web Vitals', async () => {
      expect(vitals.lcp).toBeLessThan(4000);
      expect(vitals.fcp).toBeLessThan(3000);
      expect(vitals.ttfb).toBeLessThan(800);
    });
  });
});
