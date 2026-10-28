import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createPortfolioServer } from '../server.mjs';
import { translate } from '../translations.js';
import { localizeMarkup } from '../localization-build.mjs';

test('translation bindings preserve whitespace, form values, and option values', () => {
  assert.equal(localizeMarkup('<div> \n </div>'), '<div> \n </div>');
  assert.match(localizeMarkup('<option value="Web Design">Web Design</option>'), /value="Web Design" data-i18n="service.design"/);
});

test('English/Persian selection, Kalameh, persistence, layout, and form feedback', async () => {
  const server = createPortfolioServer().listen(0, '127.0.0.1');
  await once(server, 'listening');
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const readGeometry = () => Object.fromEntries([...document.querySelectorAll('#home,#services,#works,#contact,.contact-form,.contact-art,.site-footer,[data-name^="Service / "],[data-name^="Project / "]')].map(el => [el.id || el.dataset.name || el.className, ['x', 'y', 'width', 'height'].map(key => el.getBoundingClientRect()[key])]));
  const choose = async language => {
    await page.locator('#language-toggle').scrollIntoViewIfNeeded();
    if (await page.locator('html').getAttribute('lang') !== language) await page.locator('#language-toggle').click();
    await page.evaluate(() => document.fonts.ready);
  };
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.locator('#portfolio [data-i18n="nav.home"]').first().waitFor();
    const originalGeometry = await page.evaluate(readGeometry);
    const originalBarberArtwork = await page.locator('[data-name="Barber Artwork"]').screenshot();
    const englishBindings = await page.locator('#portfolio [data-i18n]').evaluateAll(elements => elements.map(el => [el.dataset.i18n, el.textContent]));
    await page.locator('#contact-name').fill('Test Visitor');
    await page.locator('#contact-email').fill('visitor@example.com');
    await page.locator('#contact-service').selectOption('Web Design');
    await page.locator('#contact-message').fill('Keep my project brief when changing languages.');
    await choose('fa');
    assert.equal(await page.locator('html').getAttribute('lang'), 'fa');
    assert.equal(await page.locator('html').getAttribute('dir'), 'rtl');
    assert.equal(await page.locator('#language-options').count(), 0);
    assert.equal(await page.locator('#contact-name').inputValue(), 'Test Visitor');
    assert.equal(await page.locator('#contact-service').inputValue(), 'Web Design');
    assert.equal(await page.locator('#contact-service option:checked').innerText(), translate('service.design', 'fa'));
    assert.equal(await page.locator('#contact-message').inputValue(), 'Keep my project brief when changing languages.');
    assert.equal(await page.locator('#contact-message').getAttribute('placeholder'), translate('form.messagePlaceholder', 'fa'));
    assert.equal(await page.locator('#contact-heading').evaluate(el => getComputedStyle(el).fontFamily), 'Kalameh, sans-serif');
    assert(await page.evaluate(() => document.fonts.check('400 16px Kalameh') && document.fonts.check('700 48px Kalameh')));
    const persianBindings = await page.locator('#portfolio [data-i18n]').evaluateAll(elements => elements.map(el => [el.dataset.i18n, el.textContent]));
    for (const [key, text] of persianBindings) assert.equal(text, translate(key, 'fa'), key);
    const translatedGeometry = await page.evaluate(readGeometry);
    for (const [key, rect] of Object.entries(originalGeometry)) {
      const mirrored = translatedGeometry[key];
      for (const i of [1, 2, 3]) assert(Math.abs(rect[i] - mirrored[i]) < 1, `${key} keeps its vertical position and size`);
      assert(Math.abs(rect[0] + mirrored[0] + rect[2] - 1440) < 2, `${key} mirrors horizontally: ${rect} vs ${mirrored}`);
    }
    assert(originalBarberArtwork.equals(await page.locator('[data-name="Barber Artwork"]').screenshot()), 'Barbers preview stays pixel-identical and English');
    const order = await page.evaluate(() => {
      const x = selector => document.querySelector(selector).getBoundingClientRect().x;
      return {
        services: ['Web Design', 'Front-End Development', 'UI/UX Strategy'].map(name => x(`[data-name="Service / ${name}"]`)),
        contactIntro: x('.contact-intro'), contactForm: x('.contact-form'),
        name: x('#contact-name'), email: x('#contact-email'),
        logo: x('[data-node-id="1:48"]'), picker: x('.language-picker'),
        emailDirection: getComputedStyle(document.querySelector('#contact-email')).direction,
      };
    });
    assert(order.services[0] > order.services[1] && order.services[1] > order.services[2], 'Service cards read right to left');
    assert(order.contactIntro > order.contactForm && order.name > order.email, 'Contact layout and fields read right to left');
    assert(order.logo > order.picker, 'Language picker follows the mirrored logo');
    assert.equal(order.emailDirection, 'ltr', 'Email input stays readable');

    // Intercept the provider so localization verification never sends real email.
    let sent = '';
    await page.route('https://formsubmit.co/**', async route => {
      sent = route.request().postData() || '';
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: false }) });
    });
    await page.locator('.contact-submit').click();
    await page.waitForFunction(() => document.querySelector('#contact-status').dataset.state === 'error');
    assert.equal(await page.locator('#contact-status').innerText(), translate('form.error', 'fa'));
    assert(sent.includes('visitor@example.com') && sent.includes('Web Design'));
    await choose('en');
    assert.equal(await page.locator('#contact-status').innerText(), translate('form.error', 'en'));
    await page.locator('#contact-name').fill('');
    await page.locator('.contact-submit').click();
    assert.equal(await page.locator('#contact-name').evaluate(el => el.validationMessage), translate('form.required', 'en'));
    await choose('fa');
    await page.locator('.contact-submit').click();
    assert.equal(await page.locator('#contact-name').evaluate(el => el.validationMessage), translate('form.required', 'fa'));

    await page.reload();
    await page.waitForFunction(() => document.documentElement.lang === 'fa');
    assert.equal(await page.locator('.language-target').textContent(), 'English');

    for (const width of [1024, 900, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(50);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `No horizontal overflow at ${width}px`);
      await page.locator('#language-toggle').scrollIntoViewIfNeeded();
      await page.locator('#language-toggle').click();
      const bounds = await page.locator('#language-toggle').boundingBox();
      assert(bounds.x >= 0 && bounds.x + bounds.width <= width, `Language toggle fits at ${width}px`);
      await page.keyboard.press('Escape');
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await choose('en');
    const restored = await page.locator('#portfolio [data-i18n]').evaluateAll(elements => elements.map(el => [el.dataset.i18n, el.textContent]));
    assert.deepEqual(restored, englishBindings, 'Switching back restores every English binding');
    const restoredGeometry = await page.evaluate(readGeometry);
    for (const [key, rect] of Object.entries(originalGeometry)) {
      rect.forEach((value, i) => assert(Math.abs(value - restoredGeometry[key][i]) < 1, `${key} returns to its English position`));
    }

    const motionPage = await browser.newPage({ reducedMotion: 'no-preference' });
    motionPage.on('pageerror', error => errors.push(error.message));
    await motionPage.goto(`http://127.0.0.1:${server.address().port}/`);
    await motionPage.locator('#services').scrollIntoViewIfNeeded();
    await motionPage.waitForTimeout(150);
    await motionPage.evaluate(async () => (await import('/i18n.js')).applyLanguage('fa'));
    await motionPage.waitForTimeout(700);
    const animatedText = await motionPage.locator('#services [data-i18n]').evaluateAll(elements => elements.map(el => [el.dataset.i18n, el.textContent]));
    for (const [key, text] of animatedText) assert.equal(text, translate(key, 'fa'), `Typing stays in the selected language: ${key}`);
    await motionPage.evaluate(async () => (await import('/i18n.js')).applyLanguage('en'));
    await motionPage.waitForTimeout(100);
    const restoredAnimation = await motionPage.locator('#services [data-i18n]').evaluateAll(elements => elements.map(el => [el.dataset.i18n, el.textContent]));
    for (const [key, text] of restoredAnimation) assert.equal(text, translate(key, 'en'));
    await motionPage.close();
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
