import './i18n.js';
import './theme.js';
import { mobileLayout } from './navigation.js';

// Fit the original Figma composition to the viewport.
const viewport = document.getElementById('viewport');
function fitDesign() {
  viewport.style.setProperty('--scale', Math.min(1, viewport.clientWidth / 1440));
}
fitDesign();
addEventListener('resize', fitDesign);

// Smooth the mouse artwork in viewport coordinates, independent of page scrolling.
const smoothCursorMedia = matchMedia('(min-width: 901px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
const smoothCursor = document.createElement('div');
smoothCursor.className = 'smooth-cursor';
smoothCursor.setAttribute('aria-hidden', 'true');
document.body.append(smoothCursor);
let cursorFrame = 0;
let cursorLastTime = 0;
let cursorX = 0, cursorY = 0, cursorTargetX = 0, cursorTargetY = 0;
let cursorVisible = false;
function hideSmoothCursor() {
  cancelAnimationFrame(cursorFrame);
  cursorFrame = 0;
  cursorVisible = false;
  document.documentElement.removeAttribute('data-smooth-cursor');
}
function drawSmoothCursor(now) {
  const elapsed = Math.min(64, Math.max(0, now - cursorLastTime));
  cursorLastTime = now;
  const blend = 1 - Math.exp(-elapsed / 35);
  cursorX += (cursorTargetX - cursorX) * blend;
  cursorY += (cursorTargetY - cursorY) * blend;
  const moving = Math.hypot(cursorTargetX - cursorX, cursorTargetY - cursorY) > 0.1;
  if (!moving) { cursorX = cursorTargetX; cursorY = cursorTargetY; }
  smoothCursor.style.transform = `translate3d(${cursorX - 13}px, ${cursorY - 5}px, 0)`;
  cursorFrame = moving ? requestAnimationFrame(drawSmoothCursor) : 0;
}
addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse' || !smoothCursorMedia.matches) {
    hideSmoothCursor();
    return;
  }
  cursorTargetX = event.clientX;
  cursorTargetY = event.clientY;
  if (!cursorVisible) {
    cursorX = cursorTargetX;
    cursorY = cursorTargetY;
    cursorVisible = true;
    smoothCursor.style.transform = `translate3d(${cursorX - 13}px, ${cursorY - 5}px, 0)`;
    document.documentElement.setAttribute('data-smooth-cursor', 'true');
  }
  if (!cursorFrame) {
    cursorLastTime = performance.now();
    cursorFrame = requestAnimationFrame(drawSmoothCursor);
  }
}, {passive: true});
smoothCursorMedia.addEventListener('change', hideSmoothCursor);
document.documentElement.addEventListener('pointerleave', hideSmoothCursor);
addEventListener('blur', hideSmoothCursor);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) hideSmoothCursor();
});

// Press just the left button of the small mouse cursor.
let cursorReleaseTimer = 0;
let cursorPressedAt = 0;
function resetMouseCursor() {
  clearTimeout(cursorReleaseTimer);
  document.documentElement.removeAttribute('data-cursor-pressed');
}
addEventListener('pointerdown', event => {
  if (event.pointerType !== 'mouse' || event.button !== 0) return;
  clearTimeout(cursorReleaseTimer);
  cursorPressedAt = performance.now();
  document.documentElement.setAttribute('data-cursor-pressed', 'true');
}, {passive: true});
addEventListener('pointerup', event => {
  if (event.pointerType !== 'mouse' || event.button !== 0) return;
  cursorReleaseTimer = setTimeout(resetMouseCursor, Math.max(0, 120 - (performance.now() - cursorPressedAt)));
}, {passive: true});
addEventListener('pointercancel', resetMouseCursor);
addEventListener('blur', resetMouseCursor);
document.documentElement.addEventListener('pointerleave', resetMouseCursor);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) resetMouseCursor();
});

// A shared gravity field pulls the sculpture toward the cursor. Each layer's
// mass adds gentle depth; local repulsion and cursor impulses disturb the
// arrangement before the damped spring restores it.
const hero = document.querySelector('[data-name="01 / Hero"]');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// Smooth wheel/trackpad input while preserving native touch scrolling.
let smoothScroll = null;
function configureSmoothScroll() {
  smoothScroll?.destroy();
  smoothScroll = reducedMotion.matches ? null : new Lenis({
    autoRaf: true,
    lerp: 0.1,
    smoothWheel: true,
    syncTouch: false,
    anchors: true,
  });
}
configureSmoothScroll();
reducedMotion.addEventListener('change', configureSmoothScroll);

const bodies = [...hero.querySelectorAll('[data-name^="Shape / "], [data-name="Orbit"]')].map((el, i) => ({
  el, mass: el.dataset.name === 'Orbit' ? 2 : [1.3, 1.1, .95, .8][i],
  bounds: el.dataset.name === 'Orbit' ? null : {},
  x: 0, y: 0, angle: 0,
  vx: 0, vy: 0, spin: 0, tx: 0, ty: 0, ta: 0,
}));
function updateSculptureBounds() {
  if (mobileLayout.matches) return;
  const rtl = getComputedStyle(hero).direction === 'rtl';
  const left = rtl ? hero.clientWidth - 1280 : 710;
  const right = rtl ? hero.clientWidth - 710 : 1280;
  for (const body of bodies) {
    if (!body.bounds) continue;
    body.bounds = {
      left: left - body.el.offsetLeft + 24,
      right: right - body.el.offsetLeft - body.el.offsetWidth - 24,
      top: 50 - body.el.offsetTop + 24,
      bottom: 590 - body.el.offsetTop - body.el.offsetHeight - 24,
    };
  }
}
updateSculptureBounds();
document.addEventListener('languagechange', updateSculptureBounds);
addEventListener('resize', updateSculptureBounds);
const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));
let frame = 0;
let previousTime = 0;
let lastPointer = null;

function wake() {
  if (!frame && !reducedMotion.matches && !mobileLayout.matches) {
    previousTime = 0;
    frame = requestAnimationFrame(step);
  }
}

function release() {
  lastPointer = null;
  for (const body of bodies) body.tx = body.ty = body.ta = 0;
  wake();
}

function step(time) {
  const dt = previousTime ? Math.min((time - previousTime) / 1000, .032) : 1 / 60;
  previousTime = time;
  let moving = false;
  for (const body of bodies) {
    const spring = (body.bounds ? 32 : 85) / body.mass;
    const damping = Math.exp(-(body.bounds ? 4.8 : 12) * dt);
    body.vx = (body.vx + (body.tx - body.x) * spring * dt) * damping;
    body.vy = (body.vy + (body.ty - body.y) * spring * dt) * damping;
    body.spin = (body.spin + (body.ta - body.angle) * spring * dt) * damping;
    body.x += body.vx * dt;
    body.y += body.vy * dt;
    body.angle += body.spin * dt;
    // Keep energetic impacts inside the sculpture's area, with a soft rebound.
    if (body.bounds) {
      const x = Math.max(body.bounds.left, Math.min(body.bounds.right, body.x));
      const y = Math.max(body.bounds.top, Math.min(body.bounds.bottom, body.y));
      if (x !== body.x) body.vx *= -.22;
      if (y !== body.y) body.vy *= -.22;
      body.x = x;
      body.y = y;
      body.angle = clamp(body.angle, 38);
    }
    body.el.style.translate = `${body.x.toFixed(3)}px ${body.y.toFixed(3)}px`;
    body.el.style.rotate = `${body.angle.toFixed(3)}deg`;
    moving ||= Math.abs(body.tx - body.x) + Math.abs(body.ty - body.y)
      + Math.abs(body.ta - body.angle) + Math.abs(body.vx) + Math.abs(body.vy) + Math.abs(body.spin) > .04;
  }
  frame = moving ? requestAnimationFrame(step) : 0;
}

addEventListener('pointermove', event => {
  if (mobileLayout.matches || reducedMotion.matches || event.pointerType === 'touch') return;
  const rect = hero.getBoundingClientRect();
  if (rect.bottom <= 0 || rect.top >= innerHeight) return;
  const scale = rect.width / hero.offsetWidth;
  const x = (event.clientX - rect.left) / scale;
  const y = (event.clientY - rect.top) / scale;
  const fieldX = clamp((x / hero.offsetWidth - .5) * 2, 1);
  const fieldY = clamp((y / hero.offsetHeight - .5) * 2, 1);
  const elapsed = lastPointer ? event.timeStamp - lastPointer.time : 0;
  const continuous = elapsed > 0 && elapsed < 120;
  const speedX = continuous ? clamp((x - lastPointer.x) / Math.max(elapsed, 8), 2) : 0;
  const speedY = continuous ? clamp((y - lastPointer.y) / Math.max(elapsed, 8), 2) : 0;
  lastPointer = {x, y, time: event.timeStamp};
  for (const body of bodies) {
    const dx = x - (body.el.offsetLeft + body.el.offsetWidth / 2 + body.x);
    const dy = y - (body.el.offsetTop + body.el.offsetHeight / 2 + body.y);
    const radius = Math.hypot(dx / (body.el.offsetWidth / 2), dy / (body.el.offsetHeight / 2));
    // Only solid shapes react to contact; the orbit keeps following the field.
    const influence = body.el.dataset.name === 'Orbit' ? 0 : Math.max(0, 1 - radius / 1.6);
    const distance = Math.max(Math.hypot(dx, dy), 24);
    body.tx = clamp((fieldX * 30 - dx / distance * 145 * influence) / body.mass, 150);
    body.ty = clamp((fieldY * 24 - dy / distance * 115 * influence) / body.mass, 135);
    body.ta = clamp((fieldX * 2.5 - fieldY * 1.2) / body.mass + dx / 5 * influence, 28);
    if (body.bounds) {
      body.tx = Math.max(body.bounds.left, Math.min(body.bounds.right, body.tx));
      body.ty = Math.max(body.bounds.top, Math.min(body.bounds.bottom, body.ty));
    }
    // Transfer a bounded impulse from a passing cursor. Integrating over event
    // time keeps the kick consistent across mouse polling rates, and velocity
    // naturally decays even when the cursor stops moving.
    const impulse = influence * Math.min(elapsed, 32) * 9 / body.mass;
    const speed = Math.hypot(speedX, speedY);
    body.vx = clamp(body.vx + (speedX * .65 - dx / distance * speed * .8) * impulse, 650);
    body.vy = clamp(body.vy + (speedY * .65 - dy / distance * speed * .8) * impulse, 560);
    body.spin = clamp(body.spin + (speedX * 4 - speedY * 2) * impulse * .18, 180);
  }
  wake();
}, {passive: true});
document.documentElement.addEventListener('pointerleave', release);
addEventListener('pointercancel', release);
addEventListener('blur', release);
addEventListener('scroll', release, {passive: true});
addEventListener('resize', release);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) release();
});
function resetSculpture() {
  cancelAnimationFrame(frame);
  frame = 0;
  lastPointer = null;
  for (const body of bodies) {
    body.x = body.y = body.angle = body.vx = body.vy = body.spin = body.tx = body.ty = body.ta = 0;
    body.el.style.translate = '';
    body.el.style.rotate = '';
  }
}
reducedMotion.addEventListener('change', resetSculpture);
mobileLayout.addEventListener('change', () => {
  resetSculpture();
  updateSculptureBounds();
});

// Each section introduction types once, when its own copy enters view.
let stopTyping = () => {};
function setupTyping() {
  stopTyping();
  const cleanups = [];
  for (const intro of document.querySelectorAll('[data-node-id="1:56"], [data-node-id="1:65"], .contact-description')) {
    if (!('IntersectionObserver' in window) || reducedMotion.matches) continue;
    const paragraphs = [...intro.querySelectorAll('[data-i18n]')];
    const lines = paragraphs.map(paragraph => {
      const text = paragraph.textContent;
      const typed = document.createElement('span');
      const remaining = document.createElement('span');
      paragraph.setAttribute('aria-label', text);
      typed.setAttribute('aria-hidden', 'true');
      remaining.setAttribute('aria-hidden', 'true');
      remaining.style.visibility = 'hidden';
      remaining.textContent = text;
      paragraph.replaceChildren(typed, remaining);
      return {text, typed, remaining};
    });
    let typingFrame = 0;
    let start = null;
    const total = lines.reduce((count, line) => count + line.text.length, 0);
    function reveal(count) {
      for (const line of lines) {
        const length = Math.max(0, Math.min(count, line.text.length));
        line.typed.textContent = line.text.slice(0, length);
        line.remaining.textContent = line.text.slice(length);
        count -= line.text.length;
      }
    }
    function type(time) {
      start ??= time;
      const count = Math.floor((time - start) / 19);
      reveal(count);
      typingFrame = count < total ? requestAnimationFrame(type) : 0;
    }
    const introObserver = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      introObserver.disconnect();
      typingFrame = requestAnimationFrame(type);
    }, {threshold: .45, rootMargin: '0px 0px -12% 0px'});
    introObserver.observe(intro);
    const revealForReducedMotion = () => {
      if (!reducedMotion.matches) return;
      introObserver.disconnect();
      cancelAnimationFrame(typingFrame);
      reveal(total);
    };
    reducedMotion.addEventListener('change', revealForReducedMotion);
    cleanups.push(() => {
      introObserver.disconnect();
      cancelAnimationFrame(typingFrame);
      reducedMotion.removeEventListener('change', revealForReducedMotion);
      for (const paragraph of paragraphs) paragraph.removeAttribute('aria-label');
    });
  }
  stopTyping = () => cleanups.forEach(cleanup => cleanup());
}
setupTyping();
document.addEventListener('languagechange', setupTyping);

// Keep the navigation indicator in sync with the section in view.
const navigationLinks = ["1:17", "1:20", "1:19", "1:21"]
  .map(id => document.querySelector(`[data-node-id="${id}"]`));
const navigationSections = navigationLinks.map(link => document.querySelector(link.getAttribute('href')));
let navigationFrame = 0;
function updateNavigation() {
  navigationFrame = 0;
  const marker = innerHeight * .35;
  let activeIndex = 0;
  navigationSections.forEach((section, index) => {
    if (section.getBoundingClientRect().top <= marker) activeIndex = index;
  });
  navigationLinks.forEach((link, index) => {
    if (index === activeIndex) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  for (const link of document.querySelectorAll('.mobile-navigation a')) {
    if (link.hash === `#${navigationSections[activeIndex].id}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
}
function scheduleNavigationUpdate() {
  if (!navigationFrame) navigationFrame = requestAnimationFrame(updateNavigation);
}
addEventListener('scroll', scheduleNavigationUpdate, {passive: true});
addEventListener('resize', scheduleNavigationUpdate);
updateNavigation();
