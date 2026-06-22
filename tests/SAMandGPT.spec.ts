import { test, expect } from '@playwright/test';

test.describe('Нагрузочное тестирование', () => {
  // ============================================
  // ОСНОВНОЙ ТЕСТ С МЕТРИКАМИ
  // ============================================
  test('Сбор метрик', async ({ page }) => {
    test.setTimeout(60000);

    // ============================================
    // ШАГ 1: Переход на сайт
    // ============================================
    await test.step('Переход на сайт Playwright', async () => {
      await page.context().clearCookies();
      await page.goto('https://playwright.dev/');
      await expect(page.getByRole('button', { name: 'Search (Control+k)' })).toBeVisible();
    });

    // ============================================
    // ШАГ 2: Поиск по сайту
    // ============================================
    await test.step('Поиск по слову "locators"', async () => {
      await page.getByRole('button', { name: 'Search (Control+k)' }).click();
      await page.getByRole('searchbox', { name: 'Search' }).fill('locators');
      await page.getByRole('link', { name: 'Locators', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: 'Locating elementsDirect link' }),
      ).toBeVisible();
    });

    // ============================================
    // ШАГ 3: Возврат на главную
    // ============================================
    await test.step('Возврат на главную страницу', async () => {
      await page.getByRole('link', { name: 'Playwright logo Playwright' }).click();
    });

    // ============================================
    // ШАГ 4: Переключение темы (3 раза)
    // ============================================
    await test.step('Переключение темы (3 раза)', async () => {
      await page.getByRole('button', { name: 'Switch between dark and light' }).click();
      await page.getByRole('button', { name: 'Switch between dark and light' }).click();
      await page.getByRole('button', { name: 'Switch between dark and light' }).click();
    });

    // ============================================
    // ШАГ 5: Переход в раздел CLI и Tracing
    // ============================================
    await test.step('Переход в раздел CLI → Tracing', async () => {
      await page.getByRole('link', { name: 'CLI', exact: true }).click();
      await page.getByRole('link', { name: 'Tracing' }).click();
      await expect(page.getByRole('heading', { name: 'Tracing' })).toBeVisible();
    });

    // ============================================
    // ШАГ 6: Сбор ВСЕХ метрик производительности
    // ============================================
    await test.step('Сбор полных метрик производительности', async () => {
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const rawMetrics = await page.evaluate(() => {
        const perfData = performance.getEntriesByType(
          'navigation',
        )[0] as PerformanceNavigationTiming;
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        const paintEntries = performance.getEntriesByType('paint');
        const lcpEntries = performance.getEntriesByType('largest-contentful-paint');

        if (!perfData) {
          return null;
        }

        // ---------- ОСНОВНЫЕ МЕТРИКИ ----------
        const totalTime = perfData.loadEventEnd - perfData.fetchStart;
        const domInteractive = perfData.domInteractive - perfData.fetchStart;
        const domContentLoaded =
          perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart;
        const loadTime = perfData.loadEventEnd - perfData.loadEventStart;

        // ---------- СЕТЕВЫЕ МЕТРИКИ ----------
        const dnsLookup = perfData.domainLookupEnd - perfData.domainLookupStart;
        const tcpConnect = perfData.connectEnd - perfData.connectStart;
        const requestTime = perfData.responseEnd - perfData.requestStart;
        const ttfb = perfData.responseStart - perfData.requestStart;
        const serverResponseTime = perfData.responseStart - perfData.fetchStart;

        // ---------- МЕТРИКИ РЕНДЕРИНГА ----------
        const fcp = paintEntries.find((p) => p.name === 'first-contentful-paint')?.startTime || 0;
        const fp = paintEntries.find((p) => p.name === 'first-paint')?.startTime || 0;
        const lcp = lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1].startTime : 0;

        // ---------- МЕТРИКИ РЕСУРСОВ ----------
        const totalResources = resources.length;
        const totalSize = resources.reduce((acc, res) => acc + (res.transferSize || 0), 0);

        const jsFiles = resources.filter((r) => r.initiatorType === 'script');
        const cssFiles = resources.filter((r) => r.initiatorType === 'css');
        const imgFiles = resources.filter((r) => r.initiatorType === 'img');
        const fontFiles = resources.filter((r) => r.initiatorType === 'font');
        const fetchFiles = resources.filter((r) => r.initiatorType === 'fetch');
        const otherFiles = resources.filter(
          (r) => !['script', 'css', 'img', 'font', 'fetch'].includes(r.initiatorType),
        );

        const jsSize = jsFiles.reduce((acc, r) => acc + (r.transferSize || 0), 0);
        const cssSize = cssFiles.reduce((acc, r) => acc + (r.transferSize || 0), 0);
        const imgSize = imgFiles.reduce((acc, r) => acc + (r.transferSize || 0), 0);
        const fontSize = fontFiles.reduce((acc, r) => acc + (r.transferSize || 0), 0);

        const slowest = resources.sort((a, b) => b.duration - a.duration)[0];

        // ---------- МЕТРИКИ ВРЕМЕНИ ----------
        const timeToFirstByte = perfData.responseStart - perfData.fetchStart;
        const timeToDomContentLoaded = perfData.domContentLoadedEventEnd - perfData.fetchStart;
        const timeToLoad = perfData.loadEventEnd - perfData.fetchStart;
        const timeToFirstRequest = resources.length > 0 ? resources[0].startTime : 0;

        // ---------- МЕТРИКИ ПРОЦЕССОРА ----------
        const domProcessing = perfData.domContentLoadedEventEnd - perfData.domInteractive;
        const domCompletion = perfData.domContentLoadedEventStart - perfData.domInteractive;

        // ---------- МЕТРИКИ РЕДИРЕКТА ----------
        const redirectTime = perfData.redirectEnd - perfData.redirectStart;
        const redirectCount = perfData.redirectCount || 0;

        return {
          totalTime,
          domInteractive,
          domContentLoaded,
          loadTime,
          dnsLookup,
          tcpConnect,
          requestTime,
          ttfb,
          serverResponseTime,
          fcp,
          fp,
          lcp,
          totalResources,
          totalSize,
          jsFiles: jsFiles.length,
          cssFiles: cssFiles.length,
          imgFiles: imgFiles.length,
          fontFiles: fontFiles.length,
          fetchFiles: fetchFiles.length,
          otherFiles: otherFiles.length,
          jsSize,
          cssSize,
          imgSize,
          fontSize,
          slowestResource: slowest
            ? {
                name: slowest.name,
                duration: slowest.duration,
                size: slowest.transferSize || 0,
                type: slowest.initiatorType,
              }
            : null,
          timeToFirstByte,
          timeToDomContentLoaded,
          timeToLoad,
          timeToFirstRequest,
          domProcessing,
          domCompletion,
          redirectTime,
          redirectCount,
        };
      });

      // ============================================
      // БЕЗОПАСНАЯ ОБРАБОТКА МЕТРИК
      // ============================================
      if (!rawMetrics) {
        console.warn('⚠️ Нет данных о метриках производительности');
        return;
      }

      // Создаём безопасный объект с дефолтными значениями
      const metrics = {
        totalTime: rawMetrics.totalTime || 0,
        domInteractive: rawMetrics.domInteractive || 0,
        domContentLoaded: rawMetrics.domContentLoaded || 0,
        loadTime: rawMetrics.loadTime || 0,
        dnsLookup: rawMetrics.dnsLookup || 0,
        tcpConnect: rawMetrics.tcpConnect || 0,
        requestTime: rawMetrics.requestTime || 0,
        ttfb: rawMetrics.ttfb || 0,
        serverResponseTime: rawMetrics.serverResponseTime || 0,
        fcp: rawMetrics.fcp || 0,
        fp: rawMetrics.fp || 0,
        lcp: rawMetrics.lcp || 0,
        totalResources: rawMetrics.totalResources || 0,
        totalSize: rawMetrics.totalSize || 0,
        jsFiles: rawMetrics.jsFiles || 0,
        cssFiles: rawMetrics.cssFiles || 0,
        imgFiles: rawMetrics.imgFiles || 0,
        fontFiles: rawMetrics.fontFiles || 0,
        fetchFiles: rawMetrics.fetchFiles || 0,
        otherFiles: rawMetrics.otherFiles || 0,
        jsSize: rawMetrics.jsSize || 0,
        cssSize: rawMetrics.cssSize || 0,
        imgSize: rawMetrics.imgSize || 0,
        fontSize: rawMetrics.fontSize || 0,
        slowestResource: rawMetrics.slowestResource || null,
        timeToFirstByte: rawMetrics.timeToFirstByte || 0,
        timeToDomContentLoaded: rawMetrics.timeToDomContentLoaded || 0,
        timeToLoad: rawMetrics.timeToLoad || 0,
        timeToFirstRequest: rawMetrics.timeToFirstRequest || 0,
        domProcessing: rawMetrics.domProcessing || 0,
        domCompletion: rawMetrics.domCompletion || 0,
        redirectTime: rawMetrics.redirectTime || 0,
        redirectCount: rawMetrics.redirectCount || 0,
      };

      // ============================================
      // ВЫВОД ВСЕХ МЕТРИК
      // ============================================
      console.log('\n' + '═'.repeat(60));
      console.log('📊 ПОЛНЫЙ ОТЧЁТ О ПРОИЗВОДИТЕЛЬНОСТИ');
      console.log('═'.repeat(60) + '\n');

      // ---------- 1. ОСНОВНЫЕ МЕТРИКИ ----------
      console.log('🚀 ОСНОВНЫЕ МЕТРИКИ ЗАГРУЗКИ:');
      console.log(`  ├─ Общее время загрузки: ${metrics.totalTime.toFixed(2)}ms`);
      console.log(`  ├─ DOM Interactive: ${metrics.domInteractive.toFixed(2)}ms`);
      console.log(`  ├─ DOM Content Loaded: ${metrics.domContentLoaded.toFixed(2)}ms`);
      console.log(`  └─ Время события load: ${metrics.loadTime.toFixed(2)}ms`);
      console.log('');

      // ---------- 2. СЕТЕВЫЕ МЕТРИКИ ----------
      console.log('🌐 СЕТЕВЫЕ МЕТРИКИ:');
      console.log(`  ├─ DNS Lookup: ${metrics.dnsLookup.toFixed(2)}ms`);
      console.log(`  ├─ TCP Connect: ${metrics.tcpConnect.toFixed(2)}ms`);
      console.log(`  ├─ Время запроса: ${metrics.requestTime.toFixed(2)}ms`);
      console.log(`  ├─ TTFB (Time to First Byte): ${metrics.ttfb.toFixed(2)}ms`);
      console.log(`  └─ Ответ сервера: ${metrics.serverResponseTime.toFixed(2)}ms`);
      console.log('');

      // ---------- 3. МЕТРИКИ РЕНДЕРИНГА ----------
      console.log('🎨 МЕТРИКИ РЕНДЕРИНГА:');
      console.log(`  ├─ FCP (First Contentful Paint): ${metrics.fcp.toFixed(2)}ms`);
      console.log(`  ├─ FP (First Paint): ${metrics.fp.toFixed(2)}ms`);
      console.log(`  └─ LCP (Largest Contentful Paint): ${metrics.lcp.toFixed(2)}ms`);
      console.log('');

      // ---------- 4. МЕТРИКИ РЕСУРСОВ ----------
      console.log('📦 МЕТРИКИ РЕСУРСОВ:');
      console.log(`  ├─ Всего ресурсов: ${metrics.totalResources}`);
      console.log(
        `  ├─ Общий размер: ${(metrics.totalSize / 1024).toFixed(2)}KB (${(metrics.totalSize / 1024 / 1024).toFixed(2)}MB)`,
      );
      console.log('  │');
      console.log(`  ├─ JS файлы: ${metrics.jsFiles} (${(metrics.jsSize / 1024).toFixed(2)}KB)`);
      console.log(`  ├─ CSS файлы: ${metrics.cssFiles} (${(metrics.cssSize / 1024).toFixed(2)}KB)`);
      console.log(
        `  ├─ Изображения: ${metrics.imgFiles} (${(metrics.imgSize / 1024).toFixed(2)}KB)`,
      );
      console.log(`  ├─ Шрифты: ${metrics.fontFiles} (${(metrics.fontSize / 1024).toFixed(2)}KB)`);
      console.log(`  ├─ Fetch/API: ${metrics.fetchFiles}`);
      console.log(`  └─ Другие: ${metrics.otherFiles}`);
      console.log('');

      // ---------- 5. МЕТРИКИ ВРЕМЕНИ ----------
      console.log('⏱️  МЕТРИКИ ВРЕМЕНИ:');
      console.log(`  ├─ Время до первого байта: ${metrics.timeToFirstByte.toFixed(2)}ms`);
      console.log(
        `  ├─ Время до DOM Content Loaded: ${metrics.timeToDomContentLoaded.toFixed(2)}ms`,
      );
      console.log(`  ├─ Время до полной загрузки: ${metrics.timeToLoad.toFixed(2)}ms`);
      console.log(`  └─ Время до первого запроса: ${metrics.timeToFirstRequest.toFixed(2)}ms`);
      console.log('');

      // ---------- 6. МЕТРИКИ ПРОЦЕССОРА ----------
      console.log('⚙️  МЕТРИКИ ПРОЦЕССОРА:');
      console.log(`  ├─ Обработка DOM: ${metrics.domProcessing.toFixed(2)}ms`);
      console.log(`  └─ Завершение DOM: ${metrics.domCompletion.toFixed(2)}ms`);
      console.log('');

      // ---------- 7. МЕТРИКИ РЕДИРЕКТА ----------
      console.log('🔄 МЕТРИКИ РЕДИРЕКТА:');
      console.log(`  ├─ Время редиректа: ${metrics.redirectTime.toFixed(2)}ms`);
      console.log(`  └─ Количество редиректов: ${metrics.redirectCount}`);
      console.log('');

      // ---------- 8. САМЫЙ МЕДЛЕННЫЙ РЕСУРС ----------
      if (metrics.slowestResource) {
        console.log('🐌 САМЫЙ МЕДЛЕННЫЙ РЕСУРС:');
        console.log(`  ├─ Название: ${metrics.slowestResource.name.split('/').pop()}`);
        console.log(`  ├─ Время загрузки: ${metrics.slowestResource.duration.toFixed(2)}ms`);
        console.log(`  ├─ Размер: ${(metrics.slowestResource.size / 1024).toFixed(2)}KB`);
        console.log(`  └─ Тип: ${metrics.slowestResource.type || 'unknown'}`);
        console.log('');
      }

      console.log('═'.repeat(60));
      console.log('✅ Сбор метрик завершён');
      console.log('═'.repeat(60) + '\n');

      // ============================================
      // ПРОВЕРКИ (АССЕРТЫ)
      // ============================================
      await test.step('Проверка критических метрик', async () => {
        expect(metrics.totalTime).toBeLessThan(5000);
        expect(metrics.domInteractive).toBeLessThan(3000);
        expect(metrics.ttfb).toBeLessThan(800);
        expect(metrics.lcp).toBeLessThan(4000);
        expect(metrics.totalResources).toBeLessThan(200);
        expect(metrics.totalSize).toBeLessThan(5 * 1024 * 1024);

        if (metrics.slowestResource) {
          expect(metrics.slowestResource.duration).toBeLessThan(2000);
        }

        console.log('✅ Все проверки пройдены!');
      });
    });
  });

  // ============================================
  // НАГРУЗОЧНЫЙ ТЕСТ: 15 пользователей одновременно
  // ============================================
  test('Нагрузочный тест: 15 пользователей одновременно', async ({ browser }) => {
    test.setTimeout(120000); // Увеличиваем таймаут до 2 минут

    const usersCount = 15;
    console.log(`\n🚀 Запуск нагрузочного теста: ${usersCount} пользователей одновременно\n`);

    const startTime = Date.now();

    // Создаём 15 пользователей параллельно
    const userTasks = Array.from({ length: usersCount }, async (_, index) => {
      const userNumber = index + 1;
      const context = await browser.newContext();
      const page = await context.newPage();

      try {
        const userStartTime = Date.now();

        // 1. Открываем сайт
        await page.goto('https://playwright.dev/', { waitUntil: 'networkidle' });

        // 2. Проверяем, что главная загрузилась
        await expect(page.getByRole('button', { name: 'Search (Control+k)' })).toBeVisible();

        // 3. Нажимаем Get Started
        await page.getByRole('link', { name: 'Get started' }).click();

        // 4. Проверяем, что страница документации загрузилась
        await expect(page).toHaveURL(/.*docs\/intro/);
        await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();

        const userEndTime = Date.now();
        const userDuration = userEndTime - userStartTime;

        await context.close();

        return {
          userNumber,
          success: true,
          duration: userDuration,
        };
      } catch (error) {
        await context.close();
        return {
          userNumber,
          success: false,
          error: error.message,
          duration: Date.now() - userStartTime,
        };
      }
    });

    // Запускаем всех пользователей параллельно
    const results = await Promise.all(userTasks);
    const totalTime = Date.now() - startTime;

    // ============================================
    // АНАЛИЗ РЕЗУЛЬТАТОВ
    // ============================================
    console.log('\n' + '═'.repeat(60));
    console.log('📊 РЕЗУЛЬТАТЫ НАГРУЗОЧНОГО ТЕСТА');
    console.log('═'.repeat(60) + '\n');

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);
    const durations = successful.map((r) => r.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length || 0;
    const maxDuration = Math.max(...durations, 0);
    const minDuration = Math.min(...durations, 0);

    console.log(`👥 Всего пользователей: ${usersCount}`);
    console.log(`✅ Успешно: ${successful.length}`);
    console.log(`❌ Ошибок: ${failed.length}`);
    console.log(`⏱️  Общее время выполнения: ${totalTime}ms`);
    console.log(`⏱️  Среднее время на пользователя: ${avgDuration.toFixed(0)}ms`);
    console.log(`⏱️  Минимальное время: ${minDuration}ms`);
    console.log(`⏱️  Максимальное время: ${maxDuration}ms`);
    console.log(
      `📈  Пропускная способность: ${(usersCount / (totalTime / 1000)).toFixed(2)} пользователей/сек`,
    );

    // Детализация по пользователям
    console.log('\n📋 Детализация по пользователям:');
    results.forEach((r) => {
      const status = r.success ? '✅' : '❌';
      const duration = r.duration || 0;
      console.log(`  ${status} Пользователь ${r.userNumber}: ${duration}ms ${r.error || ''}`);
    });

    // Выводим ошибки
    if (failed.length > 0) {
      console.log('\n❌ Ошибки:');
      failed.forEach((r) => {
        console.log(`  - Пользователь ${r.userNumber}: ${r.error}`);
      });
    }

    console.log('\n' + '═'.repeat(60));

    // ============================================
    // ПРОВЕРКИ
    // ============================================
    // Все пользователи должны успешно выполнить свои сценарии
    expect(failed.length).toBe(0);

    // Среднее время не должно превышать 10 секунд
    expect(avgDuration).toBeLessThan(10000);

    // Максимальное время не должно превышать 15 секунд
    expect(maxDuration).toBeLessThan(15000);

    console.log('✅ Все проверки нагрузочного теста пройдены!');
  });
});
