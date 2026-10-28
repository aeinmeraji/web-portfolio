import { translate } from './translations.js';

const storageKey = 'portfolio-language';
let language = 'en';
try { if (localStorage.getItem(storageKey) === 'fa') language = 'fa'; } catch { /* Storage may be unavailable in private browsing. */ }
export const t = key => translate(key, language);
export const getLanguage = () => language;

export function applyLanguage(nextLanguage) {
  if (!['en', 'fa'].includes(nextLanguage)) return;
  language = nextLanguage;
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'fa' ? 'rtl' : 'ltr';
  for (const element of document.querySelectorAll('[data-i18n]')) element.textContent = t(element.dataset.i18n);
  for (const attribute of ['aria-label', 'placeholder', 'title', 'alt']) {
    for (const element of document.querySelectorAll(`[data-i18n-${attribute}]`)) {
      element.setAttribute(attribute, t(element.getAttribute(`data-i18n-${attribute}`)));
    }
  }
  document.title = t('page.title');
  const target = document.querySelector('.language-target');
  target.textContent = language === 'en' ? '\u0641\u0627\u0631\u0633\u06cc' : 'English';
  target.lang = language === 'en' ? 'fa' : 'en';
  target.dir = language === 'en' ? 'rtl' : 'ltr';
  document.getElementById('language-toggle').setAttribute('aria-label', language === 'en' ? 'Switch to Persian' : 'Switch to English');
  for (const button of document.querySelectorAll('[data-language]')) button.setAttribute('aria-pressed', String(button.dataset.language === language));
  for (const field of document.querySelectorAll('#contact-form [required]')) field.setCustomValidity('');
  try { localStorage.setItem(storageKey, language); } catch { /* Switching still works without persistence. */ }
  document.dispatchEvent(new CustomEvent('languagechange', { detail: { language } }));
}

const toggle = document.getElementById('language-toggle');
toggle.addEventListener('click', () => applyLanguage(language === 'en' ? 'fa' : 'en'));
applyLanguage(language);
