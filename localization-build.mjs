import { messages } from './translations.js';

const byEnglish = new Map(Object.entries(messages).filter(([, [english]]) => english).map(([key, [english]]) => [english, key]));
const decode = text => text.replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&#8599;', '↗');
const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

// Add bindings to the existing text nodes; never rebuild or mirror the composition.
export function localizeMarkup(html) {
  const tokens = html.split(/(<[^>]+>)/g);
  const ancestors = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].startsWith('<')) {
      const tag = tokens[i].match(/^<\/?([\w-]+)/)?.[1];
      if (!tag) continue;
      if (tokens[i].startsWith('</')) {
        ancestors.pop();
        continue;
      }
      const excluded = ancestors.at(-1)?.excluded || /\btranslate="no"/.test(tokens[i]);
      if (!voidTags.has(tag) && !tokens[i].endsWith('/>')) ancestors.push({ tag, excluded, bound: /\bdata-i18n="/.test(tokens[i]) });
      if (excluded) continue;
      tokens[i] = tokens[i].replace(/\b(aria-label|placeholder|title|alt)="([^"]+)"/g, (match, attribute, value) => {
        const key = byEnglish.get(decode(value));
        return key ? `${match} data-i18n-${attribute}="${key}"` : match;
      });
      // Option text changes must not change the selected/submitted service value.
      continue;
    }
    if (ancestors.at(-1)?.excluded || ancestors.at(-1)?.bound) continue;
    const text = decode(tokens[i].trim());
    if (!text) continue;
    const copyright = text.match(/^© (\d{4}) Aein Meraji$/);
    if (copyright) {
      tokens[i] = tokens[i].replace('Aein Meraji', '<span data-i18n="footer.name">Aein Meraji</span>');
      continue;
    }
    const key = byEnglish.get(text);
    if (!key) continue;
    if (ancestors.at(-1)?.tag === 'option') tokens[i - 1] = tokens[i - 1].replace(/>$/, ` data-i18n="${key}">`);
    else if (ancestors.at(-1)?.tag !== 'noscript') tokens[i] = tokens[i].replace(tokens[i].trim(), `<span data-i18n="${key}">${tokens[i].trim()}</span>`);
  }
  return tokens.join('');
}

export function renderLanguagePicker() {
  return `<div class="language-picker"><button id="language-toggle" type="button" aria-label="Switch to Persian"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 6.5h14M5 17.5h14"/></svg><span class="language-target" lang="fa" dir="rtl">فارسی</span></button><button id="theme-toggle" type="button" aria-label="Switch to dark theme" aria-pressed="false"><svg class="theme-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/></svg><svg class="theme-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg></button></div>`;
}
