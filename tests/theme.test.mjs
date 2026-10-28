import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createPortfolioServer } from '../server.mjs';

test('theme, language, persistence, and responsive layout', async () => {
  const server = createPortfolioServer().listen(0, '127.0.0.1');
  await once(server, 'listening');
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });
  const url = `http://127.0.0.1:${server.address().port}/`;
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(url);
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    await page.locator('#theme-toggle').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#theme-toggle').getAttribute('aria-pressed'), 'true');
    await page.reload();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    const markup = await (await page.request.get(url)).text();
    assert(markup.indexOf('portfolio-theme') < markup.indexOf('rel="stylesheet"'), 'Theme is restored before stylesheets');
    await mkdir('output/theme', { recursive: true });
    for (const language of ['en', 'fa']) {
      await page.evaluate(async lang => (await import('/i18n.js')).applyLanguage(lang), language);
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
      assert.equal(await page.locator('#theme-toggle').getAttribute('aria-label'), language === 'en' ? 'Switch to light theme' : '\u062a\u063a\u06cc\u06cc\u0631 \u0628\u0647 \u062d\u0627\u0644\u062a \u0631\u0648\u0634\u0646');
      await page.setViewportSize({ width: 390, height: 900 });
      await page.locator('.menu-toggle').click();
      assert.equal(await page.locator('#mobile-navigation').isVisible(), true);
      await page.keyboard.press('Escape');
      await page.locator('[data-ui="contact-button"]').click();
      assert.equal(await page.locator('.phone-panel').evaluate(el => el.open), true);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.phone-panel').evaluate(el => el.open), false);
      assert.match(await page.locator('[data-name="Project Preview"]').getAttribute('href'), /^https:/);
      assert.match(await page.locator('[data-name="Project / Aein Barbers"]').getAttribute('href'), /^https:/);
      let calls = 0;
      await page.route('https://formsubmit.co/**', async route => { calls++; await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) }); });
      await page.locator('.contact-submit').click();
      assert.equal(calls, 0);
      await page.locator('#contact-name').fill('Theme Test');
      await page.locator('#contact-email').fill('visitor@example.com');
      await page.locator('#contact-service').selectOption('Web Design');
      await page.locator('#contact-message').fill('A complete test project description.');
      await page.locator('.contact-submit').click();
      await page.waitForFunction(() => document.getElementById('contact-status').dataset.state === 'success');
      assert.equal(calls, 1);
      await page.unroute('https://formsubmit.co/**');
      for (const theme of ['dark', 'light']) {
        if (await page.locator('html').getAttribute('data-theme') !== theme) await page.locator('#theme-toggle').click();
        for (const width of [320, 390, 768, 900, 901, 1024, 1440]) {
          await page.setViewportSize({ width, height: 900 });
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${language} ${theme} ${width} overflow`);
          if ([390, 1440].includes(width)) await page.screenshot({ path: `output/theme/${language}-${theme}-${width}.png`, fullPage: true });
        }
      }
      await page.locator('#theme-toggle').click();
    }
    assert.deepEqual(errors, []);
    await page.evaluate(() => localStorage.setItem('portfolio-theme', 'invalid'));
    await page.reload();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    const blocked = await browser.newPage();
    await blocked.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
    await blocked.goto(url);
    assert.equal(await blocked.locator('html').getAttribute('data-theme'), 'light');
    await blocked.locator('#theme-toggle').click();
    assert.equal(await blocked.locator('html').getAttribute('data-theme'), 'dark');
    await blocked.close();
  } finally { await browser.close(); server.close(); }
});
