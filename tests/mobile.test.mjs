import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createPortfolioServer } from '../server.mjs';

test('mobile layouts, dropdown navigation, language switching, phone dialog, and form', async () => {
  const server = createPortfolioServer().listen(0, '127.0.0.1');
  await once(server, 'listening');
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const setLanguage = language => page.evaluate(async lang => (await import('/i18n.js')).applyLanguage(lang), language);
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.locator('.menu-toggle').waitFor();
    for (const language of ['en', 'fa']) {
      await setLanguage(language);
      await page.evaluate(() => document.fonts.ready);
      for (const width of [320, 360, 390, 430, 768, 900, 901, 1024, 1440]) {
        await page.setViewportSize({ width, height: 844 });
        await page.waitForTimeout(60);
        const geometry = await page.evaluate(() => {
          const rect = el => el.getBoundingClientRect().toJSON();
          const cards = name => [...document.querySelectorAll(`[data-ui="${name}"]`)].map(rect);
          return {
            width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
            zoom: getComputedStyle(document.getElementById('portfolio')).zoom,
            services: cards('service-card'), projects: cards('project-card'),
            fields: [...document.querySelectorAll('.contact-field')].map(rect),
            hero: rect(document.getElementById('home')),
            font: getComputedStyle(document.querySelector('[data-ui="service-description"]')).fontSize,
          };
        });
        assert(geometry.scrollWidth <= width + 1, `No overflow: ${language} ${width}px`);
        assert.equal(await page.locator('.menu-toggle').isVisible(), width <= 900);
        if (width > 900) continue;
        assert.equal(geometry.zoom, '1', 'Mobile text and layout are not scaled');
        assert(parseFloat(geometry.font) >= 15);
        for (const list of [geometry.services, geometry.projects, geometry.fields]) {
          for (let i = 0; i < list.length; i++) {
            assert(list[i].x >= 0 && list[i].right <= width, 'Cards and fields fit the viewport');
            if (i) assert(list[i].top >= list[i - 1].bottom, 'Cards and fields form one vertical column');
          }
        }
        for (const [buttonRole, labelRole] of [['resume-button', 'resume-label'], ['contact-button', 'contact-label']]) {
          const button = await page.locator(`[data-ui="${buttonRole}"]`).boundingBox();
          const label = await page.locator(`[data-ui="${labelRole}"] > [data-i18n]`).boundingBox();
          assert(button.height >= 44);
          assert(Math.abs(button.x + button.width / 2 - label.x - label.width / 2) < 1);
          assert(Math.abs(button.y + button.height / 2 - label.y - label.height / 2) < 1);
        }
      }
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => scrollTo(0, 0));
    const toggle = page.locator('.menu-toggle');
    const menu = page.locator('#mobile-navigation');
    await toggle.click();
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
    assert.equal(await menu.locator('a:first-child').evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Escape');
    assert.equal(await menu.isHidden(), true);
    assert.equal(await toggle.evaluate(el => el === document.activeElement), true);
    await toggle.click();
    await page.locator('.mobile-availability').click();
    assert.equal(await menu.isHidden(), true, 'Outside click dismisses menu');
    await toggle.click();
    await menu.locator('a[href="#services"]').click();
    assert.equal(await menu.isHidden(), true);
    await page.waitForTimeout(100);
    const landing = await page.evaluate(() => ({ section: document.getElementById('services').getBoundingClientRect().top, header: document.querySelector('.site-header').getBoundingClientRect().bottom }));
    assert(landing.section >= landing.header, 'Section heading is below sticky header');
    await toggle.click();
    await page.setViewportSize({ width: 1024, height: 844 });
    assert.equal(await menu.isHidden(), true, 'Desktop transition dismisses menu');
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-ui="contact-button"]').click();
    assert.equal(await page.locator('.phone-panel').evaluate(el => el.open), true);
    assert.equal(await page.locator('.phone-call').getAttribute('href'), 'tel:+989158806772');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.phone-panel').evaluate(el => el.open), false);

    await page.locator('#contact-name').fill('Mobile Visitor');
    await page.locator('#contact-email').fill('mobile@example.com');
    await page.locator('#contact-service').selectOption('Web Design');
    await page.locator('#contact-message').fill('A project enquiry submitted from the mobile layout.');
    await setLanguage('en');
    assert.equal(await page.locator('#contact-name').inputValue(), 'Mobile Visitor');
    assert.equal(await page.locator('#contact-service').inputValue(), 'Web Design');
    let calls = 0;
    await page.route('https://formsubmit.co/**', async route => {
      calls++;
      assert((route.request().postData() || '').includes('mobile@example.com'));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });
    await page.locator('.contact-submit').click();
    await page.waitForFunction(() => document.getElementById('contact-status').dataset.state === 'success');
    assert.equal(calls, 1);
    assert.equal(await page.locator('#contact-name').inputValue(), '');
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
