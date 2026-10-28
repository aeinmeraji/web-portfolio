import { t } from './i18n.js';

const root = document.documentElement;
const toggle = document.getElementById('theme-toggle');

function updateControl() {
  const dark = root.dataset.theme === 'dark';
  toggle.setAttribute('aria-pressed', String(dark));
  toggle.setAttribute('aria-label', t(dark ? 'theme.light' : 'theme.dark'));
}

toggle.addEventListener('click', () => {
  const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = theme;
  try { localStorage.setItem('portfolio-theme', theme); } catch { /* The control remains usable without storage. */ }
  updateControl();
});
document.addEventListener('languagechange', updateControl);
updateControl();
