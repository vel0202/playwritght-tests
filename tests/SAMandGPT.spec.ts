import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  test.setTimeout(60000);

  // ============================================
  // ШАГ 1: Переход на сайт
  // ============================================
  await test.step('Переход на сайт Playwright', async () => {
    // Очищаем кеш для чистоты измерений
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
    await expect(page.getByRole('heading', { name: 'Locating elementsDirect link' })).toBeVisible();
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
    // Ждём полной загрузки
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const metrics = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const paintEntries = performance.getEntriesByType('paint');
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint');

      if (!perfData) {
        return { error: 'Нет данных о навигации' };
      }

      // ============================================
      // 1. ОСНОВНЫЕ МЕТРИКИ ЗАГРУЗКИ
      // ============================================
      const totalTime = perfData.loadEventEnd - perfData.fetchStart;
      const domInteractive = perfData.domInteractive - perfData.fetchStart;
      const domContentLoaded =
        perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart;
      const loadTime = perfData.loadEventEnd - perfData.loadEventStart;

      // ============================================
      // 2. СЕТЕВЫЕ МЕТРИКИ
      // ============================================
      const dnsLookup = perfData.domainLookupEnd - perfData.domainLookupStart;
      const tcpConnect = perfData.connectEnd - perfData.connectStart;
      const requestTime = perfData.responseEnd - perfData.requestStart;
      const ttfb = perfData.responseStart - perfData.requestStart;
      const serverResponseTime = perfData.responseStart - perfData.fetchStart;

      // ============================================
      // 3. МЕТРИКИ РЕНДЕРИНГА (Paint)
      // ============================================
      const fcp = paintEntries.find((p) => p.name === 'first-contentful-paint')?.startTime || 0;
      const fp = paintEntries.find((p) => p.name === 'first-paint')?.startTime || 0;

      // ============================================
      // 4. LCP (Largest Contentful Paint)
      // ============================================
      const lcp = lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1].startTime : 0;

      // ============================================
      // 5. МЕТРИКИ РЕСУРСОВ
      // ============================================
      const totalResources = resources.length;
      const totalSize = resources.reduce((acc, res) => acc + (res.transferSize || 0), 0);

      // Ресурсы по типам
      const jsFiles = resources.filter((r) => r.initiatorType === 'script');
      const cssFiles = resources.filter((r) => r.initiatorType === 'css');
      const imgFiles = resources.filter((r) => r.initiatorType === 'img');
      const fontFiles = resources.filter((r) => r.initiatorType === 'font');
      const fetchFiles = resources.filter((r) => r.initiatorType === 'fetch');
      const otherFiles = resources.filter(
        (r) => !['script', 'css', 'img', 'font', 'fetch'].includes(r.initiatorType),
      );

      // Размеры по типам
      const jsSize = jsFiles.reduce((acc, r) => acc + (r.transferSize || 0), 0);
      const cssSize = cssFiles.reduce((acc, r) => acc + (r.transferSize || 0), 0);
      const imgSize = imgFiles.reduce((acc, r) => acc + (r.transferSize || 0), 0);
      const fontSize = fontFiles.reduce((acc, r) => acc + (r.transferSize || 0), 0);

      // Самый медленный ресурс
      const slowestResource = resources.sort((a, b) => b.duration - a.duration)[0];

      // ============================================
      // 6. МЕТРИКИ ВРЕМЕНИ
      // ============================================
      const timeToFirstByte = perfData.responseStart - perfData.fetchStart;
      const timeToDomContentLoaded = perfData.domContentLoadedEventEnd - perfData.fetchStart;
      const timeToLoad = perfData.loadEventEnd - perfData.fetchStart;
      const timeToFirstRequest = resources.length > 0 ? resources[0].startTime : 0;

      // ============================================
      // 7. МЕТРИКИ ПРОЦЕССОРА
      // ============================================
      const domProcessing = perfData.domContentLoadedEventEnd - perfData.domInteractive;
      const domCompletion = perfData.domContentLoadedEventStart - perfData.domInteractive;

      // ============================================
      // 8. МЕТРИКИ РЕДИРЕКТА
      // ============================================
      const redirectTime = perfData.redirectEnd - perfData.redirectStart;
      const redirectCount = perfData.redirectCount || 0;

      return {
        // ---------- ОСНОВНЫЕ МЕТРИКИ ----------
        totalTime,
        domInteractive,
        domContentLoaded,
        loadTime,

        // ---------- СЕТЕВЫЕ МЕТРИКИ ----------
        dnsLookup,
        tcpConnect,
        requestTime,
        ttfb,
        serverResponseTime,

        // ---------- МЕТРИКИ РЕНДЕРИНГА ----------
        fcp,
        fp,
        lcp,

        // ---------- МЕТРИКИ РЕСУРСОВ ----------
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
        slowestResource: slowestResource
          ? {
              name: slowestResource.name,
              duration: slowestResource.duration,
              size: slowestResource.transferSize || 0,
              type: slowestResource.initiatorType,
            }
          : null,

        // ---------- МЕТРИКИ ВРЕМЕНИ ----------
        timeToFirstByte,
        timeToDomContentLoaded,
        timeToLoad,
        timeToFirstRequest,

        // ---------- МЕТРИКИ ПРОЦЕССОРА ----------
        domProcessing,
        domCompletion,

        // ---------- МЕТРИКИ РЕДИРЕКТА ----------
        redirectTime,
        redirectCount,
      };
    });

    if (metrics.error) {
      console.warn('⚠️', metrics.error);
      return;
    }

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
    console.log(`  ├─ Изображения: ${metrics.imgFiles} (${(metrics.imgSize / 1024).toFixed(2)}KB)`);
    console.log(`  ├─ Шрифты: ${metrics.fontFiles} (${(metrics.fontSize / 1024).toFixed(2)}KB)`);
    console.log(`  ├─ Fetch/API: ${metrics.fetchFiles}`);
    console.log(`  └─ Другие: ${metrics.otherFiles}`);
    console.log('');

    // ---------- 5. МЕТРИКИ ВРЕМЕНИ ----------
    console.log('⏱️  МЕТРИКИ ВРЕМЕНИ:');
    console.log(`  ├─ Время до первого байта: ${metrics.timeToFirstByte.toFixed(2)}ms`);
    console.log(`  ├─ Время до DOM Content Loaded: ${metrics.timeToDomContentLoaded.toFixed(2)}ms`);
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
      // Основные проверки
      expect(metrics.totalTime).toBeLessThan(5000);
      expect(metrics.domInteractive).toBeLessThan(4000);
      expect(metrics.ttfb).toBeLessThan(800);
      expect(metrics.lcp).toBeLessThan(4000);

      // Проверка, что страница не слишком тяжёлая
      expect(metrics.totalResources).toBeLessThan(200);
      expect(metrics.totalSize).toBeLessThan(5 * 1024 * 1024); // 5MB

      // Проверка, что нет медленных ресурсов (> 2 секунд)
      if (metrics.slowestResource) {
        expect(metrics.slowestResource.duration).toBeLessThan(2000);
      }

      console.log('✅ Все проверки пройдены!');
    });
  });
});
