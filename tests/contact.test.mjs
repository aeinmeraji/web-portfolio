import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createPortfolioServer } from '../server.mjs';
import { contact } from '../contact-view.mjs';

test('contact form, delivery responses, links, and responsive layout', async () => {
  const server = createPortfolioServer().listen(0, '127.0.0.1');
  await once(server, 'listening');
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.locator('#contact').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('.contact-email').getAttribute('href'), `mailto:${contact.email}`);
    for (const { href } of contact.socialLinks) assert.equal(await page.locator(`.contact-social[href="${href}"]`).count(), 1);
    for (const link of await page.locator('.site-footer a[href^="#"]').all()) {
      const id = await link.getAttribute('href');
      assert.equal(await page.locator(id).count(), 1, `Footer destination ${id} exists`);
    }

    // Browser tests intercept the provider: no test enquiries are sent to Gmail.
    let calls = 0;
    let reply = { success: true, message: 'Success! Your form was submitted successfully.' };
    let networkFailure = false;
    let submitted = '';
    await page.route('https://formsubmit.co/**', async route => {
      calls++;
      submitted = route.request().postData() || '';
      await new Promise(resolve => setTimeout(resolve, 150));
      if (networkFailure) return route.abort('failed');
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(reply) });
    });
    const send = page.locator('.contact-submit');
    const status = page.locator('#contact-status');
    await send.click();
    assert.equal(calls, 0, 'Empty form must not send');
    await page.locator('#contact-name').fill('  Test Visitor  ');
    await page.locator('#contact-email').fill('invalid');
    await page.locator('#contact-service').selectOption('Web Design');
    await page.locator('#contact-message').fill('A new portfolio website with a clear project brief.');
    await send.click();
    assert.equal(calls, 0, 'Invalid email must not send');
    await page.locator('#contact-email').fill('visitor@example.com');
    await page.locator('#contact-message').fill('          ');
    await send.click();
    assert.equal(calls, 0, 'Whitespace-only messages must not send');
    await page.locator('#contact-message').fill('A new portfolio website with a clear project brief.');
    await send.click();
    assert.equal(await send.isDisabled(), true);
    await page.locator('#contact-form').evaluate(form => form.requestSubmit());
    await page.waitForFunction(() => document.querySelector('#contact-status').dataset.state === 'success');
    assert.equal(calls, 1, 'Duplicate submissions are blocked');
    assert(submitted.includes('visitor@example.com') && submitted.includes('Web Design') && submitted.includes('Test Visitor'));
    assert.equal(await page.locator('#contact-message').inputValue(), '', 'Accepted enquiries clear the form');

    const fillValid = async () => {
      await page.locator('#contact-name').fill('Test Visitor');
      await page.locator('#contact-email').fill('visitor@example.com');
      await page.locator('#contact-service').selectOption('UI/UX Strategy');
      await page.locator('#contact-message').fill('Please keep this message when a request fails.');
    };
    for (const scenario of ['activation', 'rejection', 'network']) {
      await fillValid();
      networkFailure = scenario === 'network';
      reply = scenario === 'activation'
        ? { success: 'true', message: 'Please activate your form by confirming your email.' }
        : { success: 'false', message: 'Rejected' };
      await send.click();
      await page.waitForFunction(() => document.querySelector('#contact-status').dataset.state === 'error');
      assert.equal(await page.locator('#contact-message').inputValue(), 'Please keep this message when a request fails.');
      assert.equal(await send.isEnabled(), true);
      if (scenario === 'activation') assert.match(await status.innerText(), /awaiting inbox confirmation/);
    }

    for (const width of [1440, 1024, 900, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.locator('#contact').scrollIntoViewIfNeeded();
      await page.waitForTimeout(100);
      const geometry = await page.evaluate(() => {
        const rect = selector => document.querySelector(selector).getBoundingClientRect().toJSON();
        return { section: rect('#contact'), form: rect('#contact-form'), footer: rect('.site-footer'), pageWidth: document.documentElement.scrollWidth, width: innerWidth };
      });
      assert(geometry.pageWidth <= width + 1, `No horizontal overflow at ${width}px: ${JSON.stringify(geometry)}`);
      assert(geometry.form.left >= 0 && geometry.form.right <= width + 1, `Form fits at ${width}px`);
      assert(geometry.footer.top >= geometry.section.bottom, `Footer follows contact at ${width}px`);
      if (width < 901) assert.equal(await page.locator('#contact-email').evaluate(el => getComputedStyle(el).fontSize), '16px');
    }
    const motionPage = await browser.newPage();
    motionPage.on('pageerror', error => errors.push(error.message));
    await motionPage.goto(`http://127.0.0.1:${server.address().port}/`);
    await motionPage.waitForSelector('html.lenis');
    await motionPage.emulateMedia({ reducedMotion: 'reduce' });
    await motionPage.waitForFunction(() => !document.documentElement.classList.contains('lenis'));
    await motionPage.close();

    const nativePage = await browser.newPage({ javaScriptEnabled: false });
    await nativePage.goto(`http://127.0.0.1:${server.address().port}/`);
    assert.equal(await nativePage.locator('#contact-form').getAttribute('action'), `https://formsubmit.co/${contact.email}`);
    assert.equal(await nativePage.locator('#contact-form').getAttribute('method'), 'post');
    assert.equal(await nativePage.locator('#contact-form [required]').count(), 4);
    await nativePage.close();
    assert.deepEqual(errors, [], 'No browser runtime errors');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
