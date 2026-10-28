import { renderLanguagePicker } from './localization-build.mjs';
import { translate } from './translations.js';

export const navigation = [
  { id: 'home', key: 'nav.home' },
  { id: 'services', key: 'nav.services' },
  { id: 'works', key: 'nav.works' },
  { id: 'contact', key: 'nav.contact' },
];

export function renderNavigationLinks() {
  return navigation.map(({ id, key }) => `<a href="#${id}"><span data-i18n="${key}">${translate(key)}</span></a>`).join('');
}

export function renderSiteHeader() {
  return `<header class="site-header">
    <a class="mobile-brand" href="#home" aria-label="Aein Meraji — back to home" data-i18n-aria-label="a11y.home"><img src="./assets/bb77b.png" alt="" width="68" height="34"></a>
    ${renderLanguagePicker()}
    <button class="menu-toggle" type="button" aria-label="Open navigation" data-i18n-aria-label="nav.open" aria-expanded="false" aria-controls="mobile-navigation"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>
    <nav id="mobile-navigation" class="mobile-navigation" aria-label="Main navigation" data-i18n-aria-label="nav.label" hidden>${renderNavigationLinks()}</nav>
  </header>`;
}
