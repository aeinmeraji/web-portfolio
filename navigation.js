import { t } from './i18n.js';

export const mobileLayout = matchMedia('(max-width: 900px)');
const header = document.querySelector('.site-header');
const toggle = header.querySelector('.menu-toggle');
const menu = document.getElementById('mobile-navigation');

function setMenu(open, restoreFocus = false) {
  menu.hidden = !open;
  toggle.setAttribute('aria-expanded', String(open));
  toggle.dataset.i18nAriaLabel = open ? 'nav.close' : 'nav.open';
  toggle.setAttribute('aria-label', t(toggle.dataset.i18nAriaLabel));
  if (restoreFocus) toggle.focus();
}

toggle.addEventListener('click', () => {
  const opening = menu.hidden;
  setMenu(opening);
  if (opening) menu.querySelector('a').focus();
});
menu.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;
  setMenu(false);
  document.querySelector(link.hash)?.focus({ preventScroll: true });
});
document.addEventListener('click', event => {
  if (!header.contains(event.target) || event.target.closest('.language-picker, .mobile-brand')) setMenu(false);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !menu.hidden) setMenu(false, true);
});
header.addEventListener('focusout', event => {
  if (!header.contains(event.relatedTarget)) setMenu(false);
});
mobileLayout.addEventListener('change', () => setMenu(false));

// Scale illustration stages, never the page or its typography.
const stages = [...document.querySelectorAll('[data-art-width]')];
function fitStage(stage) {
  if (!mobileLayout.matches) return;
  stage.style.setProperty('--art-scale', stage.clientWidth / Number(stage.dataset.artWidth));
}
const stageObserver = new ResizeObserver(entries => entries.forEach(({ target }) => fitStage(target)));
for (const stage of stages) stageObserver.observe(stage);
mobileLayout.addEventListener('change', () => stages.forEach(fitStage));
document.addEventListener('languagechange', () => stages.forEach(fitStage));
stages.forEach(fitStage);
