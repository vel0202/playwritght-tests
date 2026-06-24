import { test, expect } from '@playwright/test';
import fs from 'fs';

test('Нагрузочный тест с задержкой между стартами', async ({ browser }) => {
  test.setTimeout(600000);

  const usersCount = 10;
  const MAX_FAILED_PERCENT = 10; // 10%
  const START_DELAY_MS = 5000; // 5 секунд между стартами

  console.log(`\n🚀 Запуск нагрузочного теста: ${usersCount} пользователей одновременно`);
  console.log(`⏱️  Задержка между стартами: ${START_DELAY_MS} мс\n`);

  const startTime = Date.now();

  // Функция для получения навигационных таймингов
  const getNavigationTimings = async (page) => {
    return await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0];
      if (!perf) return null;
      return {
        domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
        load: perf.loadEventEnd - perf.loadEventStart,
        responseEnd: perf.responseEnd - perf.requestStart,
        domInteractive: perf.domInteractive - perf.requestStart,
        totalTime: perf.loadEventEnd - perf.requestStart,
        transferSize: perf.transferSize || 0,
        encodedBodySize: perf.encodedBodySize || 0,
        decodedBodySize: perf.decodedBodySize || 0,
      };
    });
  };

  // Функция, выполняющая сценарий для одного пользователя
  const runUserSession = async (userNumber) => {
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();

    let loginTime = 0;
    let orgClickTime = 0;
    let searchTime = 0;
    let mainPageLoadTime = 0;
    let navigationTimings = null;
    let userStartTime = Date.now();
    let errorMessage = null;

    try {
      // ---------- 1. Загрузка главной страницы ----------
      const gotoStart = Date.now();
      await page.goto('https://ogd.ias.ru', { waitUntil: 'networkidle' });
      mainPageLoadTime = Date.now() - gotoStart;
      navigationTimings = await getNavigationTimings(page);

      // ---------- 2. Логин ----------
      const loginStart = Date.now();
      await page.getByRole('textbox', { name: 'Логин' }).fill('dev1');
      await page.getByRole('textbox', { name: 'Пароль' }).fill('$Demo123456');
      await page.getByRole('button', { name: 'Войти' }).click();
      await expect(page.getByText('ГИСОГД Оренбургской области')).toBeVisible({
        timeout: 50000,
      });
      loginTime = Date.now() - loginStart;

      // ---------- 3. Переход к организациям ----------
      const orgStart = Date.now();
      await page
        .getByRole('cell', { name: 'Ресурсоснабжающие организации' })
        .locator('img')
        .click({ timeout: 50000 });
      await expect(page.getByText(' В работе запросы ТУ ')).toBeVisible({
        timeout: 50000,
      });
      orgClickTime = Date.now() - orgStart;

      // ---------- 4. Поиск ----------
      const searchStart = Date.now();
      await page.getByPlaceholder('номер, дата, наименование').fill('102');
      await page.locator('#fullsearchfield-1020-trigger-search').click();
      await page.locator('#button-1005').click();
      await page.waitForTimeout(1000);
      searchTime = Date.now() - searchStart;

      const totalUserTime = Date.now() - userStartTime;

      await page.waitForTimeout(100);
      await context.close();

      return {
        userNumber,
        success: true,
        totalUserTime,
        mainPageLoadTime,
        loginTime,
        orgClickTime,
        searchTime,
        navigationTimings,
        error: null,
      };
    } catch (error) {
      const totalUserTime = Date.now() - userStartTime;
      errorMessage = error.message || 'Unknown error';
      await page.waitForTimeout(100);
      await context.close();
      return {
        userNumber,
        success: false,
        totalUserTime,
        mainPageLoadTime,
        loginTime,
        orgClickTime,
        searchTime,
        navigationTimings,
        error: errorMessage,
      };
    }
  };

  // Запускаем пользователей с задержкой
  const userTasks = [];
  for (let i = 0; i < usersCount; i++) {
    const userNumber = i + 1;
    console.log(`👤 Старт пользователя ${userNumber}...`);
    const task = runUserSession(userNumber);
    userTasks.push(task);
    if (i < usersCount - 1) {
      await new Promise((resolve) => setTimeout(resolve, START_DELAY_MS));
    }
  }

  const results = await Promise.all(userTasks);
  const totalTestTime = Date.now() - startTime;

  // ============================================
  // АГРЕГАЦИЯ СТАТИСТИКИ (как было)
  // ============================================
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  const calcStats = (arr) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const count = sorted.length;
    if (count === 0) return { avg: 0, median: 0, p95: 0, p99: 0, min: 0, max: 0, stdDev: 0 };
    const sum = sorted.reduce((a, b) => a + b, 0);
    const avg = sum / count;
    const mid = Math.floor(count / 2);
    const median = count % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    const p95 = sorted[Math.ceil((95 / 100) * count) - 1] || 0;
    const p99 = sorted[Math.ceil((99 / 100) * count) - 1] || 0;
    const min = sorted[0];
    const max = sorted[count - 1];
    const variance = sorted.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / count;
    const stdDev = Math.sqrt(variance);
    return { avg, median, p95, p99, min, max, stdDev };
  };

  const durations = successful.map((r) => r.totalUserTime);
  const mainPageLoads = successful.map((r) => r.mainPageLoadTime);
  const logins = successful.map((r) => r.loginTime);
  const orgClicks = successful.map((r) => r.orgClickTime);
  const searches = successful.map((r) => r.searchTime);

  const navTimings = successful.map((r) => r.navigationTimings).filter((t) => t !== null);

  const stats = {
    totalUserTime: calcStats(durations),
    mainPageLoad: calcStats(mainPageLoads),
    login: calcStats(logins),
    orgClick: calcStats(orgClicks),
    search: calcStats(searches),
  };

  const navStats = {
    domContentLoaded: calcStats(navTimings.map((t) => t.domContentLoaded)),
    load: calcStats(navTimings.map((t) => t.load)),
    responseEnd: calcStats(navTimings.map((t) => t.responseEnd)),
    domInteractive: calcStats(navTimings.map((t) => t.domInteractive)),
    totalTime: calcStats(navTimings.map((t) => t.totalTime)),
    transferSize: calcStats(navTimings.map((t) => t.transferSize)),
    encodedBodySize: calcStats(navTimings.map((t) => t.encodedBodySize)),
    decodedBodySize: calcStats(navTimings.map((t) => t.decodedBodySize)),
  };

  // ============================================
  // ВЫВОД ОТЧЁТА (как было)
  // ============================================
  console.log('\n' + '═'.repeat(80));
  console.log('📊 РЕЗУЛЬТАТЫ НАГРУЗОЧНОГО ТЕСТА (ГИСОГД) – СЕТЕВЫЕ МЕТРИКИ');
  console.log('═'.repeat(80) + '\n');

  console.log(`👥 Всего пользователей: ${usersCount}`);
  console.log(`✅ Успешно: ${successful.length}`);
  console.log(`❌ Ошибок: ${failed.length}`);
  console.log(`⏱️  Общее время выполнения теста: ${totalTestTime}ms`);
  console.log(
    `📈  Пропускная способность: ${(usersCount / (totalTestTime / 1000)).toFixed(2)} польз/сек\n`,
  );

  console.log('📏 СТАТИСТИКА ПО ШАГАМ (в мс):');
  console.log(`  Общее время сессии:`);
  console.log(
    `    Среднее: ${stats.totalUserTime.avg.toFixed(0)}  Медиана: ${stats.totalUserTime.median.toFixed(0)}  95%: ${stats.totalUserTime.p95.toFixed(0)}  99%: ${stats.totalUserTime.p99.toFixed(0)}`,
  );
  console.log(
    `    Мин: ${stats.totalUserTime.min}  Макс: ${stats.totalUserTime.max}  Стд.откл: ${stats.totalUserTime.stdDev.toFixed(0)}`,
  );

  console.log(`\n  Загрузка главной страницы:`);
  console.log(
    `    Среднее: ${stats.mainPageLoad.avg.toFixed(0)}  Медиана: ${stats.mainPageLoad.median.toFixed(0)}  95%: ${stats.mainPageLoad.p95.toFixed(0)}  99%: ${stats.mainPageLoad.p99.toFixed(0)}`,
  );
  console.log(
    `    Мин: ${stats.mainPageLoad.min}  Макс: ${stats.mainPageLoad.max}  Стд.откл: ${stats.mainPageLoad.stdDev.toFixed(0)}`,
  );

  console.log(`\n  Время входа (логин):`);
  console.log(
    `    Среднее: ${stats.login.avg.toFixed(0)}  Медиана: ${stats.login.median.toFixed(0)}  95%: ${stats.login.p95.toFixed(0)}  99%: ${stats.login.p99.toFixed(0)}`,
  );
  console.log(
    `    Мин: ${stats.login.min}  Макс: ${stats.login.max}  Стд.откл: ${stats.login.stdDev.toFixed(0)}`,
  );

  console.log(`\n  Переход к организациям:`);
  console.log(
    `    Среднее: ${stats.orgClick.avg.toFixed(0)}  Медиана: ${stats.orgClick.median.toFixed(0)}  95%: ${stats.orgClick.p95.toFixed(0)}  99%: ${stats.orgClick.p99.toFixed(0)}`,
  );
  console.log(
    `    Мин: ${stats.orgClick.min}  Макс: ${stats.orgClick.max}  Стд.откл: ${stats.orgClick.stdDev.toFixed(0)}`,
  );

  console.log(`\n  Поиск:`);
  console.log(
    `    Среднее: ${stats.search.avg.toFixed(0)}  Медиана: ${stats.search.median.toFixed(0)}  95%: ${stats.search.p95.toFixed(0)}  99%: ${stats.search.p99.toFixed(0)}`,
  );
  console.log(
    `    Мин: ${stats.search.min}  Макс: ${stats.search.max}  Стд.откл: ${stats.search.stdDev.toFixed(0)}`,
  );

  console.log('\n🌐 НАВИГАЦИОННЫЕ ТАЙМИНГИ (главная страница, средние значения в мс):');
  console.log(`  Время ответа сервера:    ${navStats.responseEnd.avg.toFixed(0)}`);
  console.log(
    `  время, за которое браузер разобрал HTML-код: ${navStats.domInteractive.avg.toFixed(0)}`,
  );
  console.log(`  Общее время:     ${navStats.totalTime.avg.toFixed(0)}`);
  console.log(`  Размер данных (средний):`);
  console.log(
    `    Размер данных, переданных по сети (сжатых):   ${(navStats.transferSize.avg / 1024).toFixed(1)} KB`,
  );
  console.log(
    `    Размер тела ответа в сжатом виде (gzip/brotli):    ${(navStats.encodedBodySize.avg / 1024).toFixed(1)} KB`,
  );
  console.log(
    `    Размер тела ответа после распаковки:    ${(navStats.decodedBodySize.avg / 1024).toFixed(1)} KB`,
  );

  if (failed.length > 0) {
    console.log('\n❌ Ошибки:');
    failed.forEach((r) => {
      console.log(`  - Пользователь ${r.userNumber}: ${r.error}`);
    });
  }

  console.log('\n📋 Детализация по пользователям (время в мс):');
  results.forEach((r) => {
    const status = r.success ? '✅' : '❌';
    console.log(
      `  ${status} Пользователь ${r.userNumber}: Общее ${r.totalUserTime} | Загрузка ${r.mainPageLoadTime || 'undefined'} | Время после кнопки войти до появления главного экрана ${r.loginTime} | время от клика по ячейке «Ресурсоснабжающие организации»  ${r.orgClickTime} | Поиск ${r.searchTime} ${r.error || ''}`,
    );
  });

  console.log('\n' + '═'.repeat(80));

  // ============================================
  // ПРОВЕРКИ
  // ============================================
  const maxAllowedFailed = Math.ceil(usersCount * (MAX_FAILED_PERCENT / 100));
  console.log(`📉 Допустимое количество ошибок: ${maxAllowedFailed} из ${usersCount}`);

  expect(failed.length).toBeLessThanOrEqual(maxAllowedFailed);
  expect(stats.totalUserTime.avg).toBeLessThan(30000);
  expect(stats.totalUserTime.max).toBeLessThan(35000);

  console.log('✅ Все проверки нагрузочного теста пройдены!');

  // ============================================
  // СОХРАНЕНИЕ ОТЧЁТА
  // ============================================
  const report = {
    timestamp: new Date().toISOString(),
    usersCount,
    totalTestTime,
    successful: successful.length,
    failed: failed.length,
    stats,
    navStats,
    details: results,
    maxAllowedFailed,
    startDelay: START_DELAY_MS,
  };
  fs.writeFileSync('load-test-report.json', JSON.stringify(report, null, 2));
  console.log('\n📁 Подробный отчёт сохранён в load-test-report.json');
});
