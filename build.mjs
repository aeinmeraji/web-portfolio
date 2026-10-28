import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { renderContact, renderFooter, renderHeroSocialRail } from './contact-view.mjs';
import { localizeMarkup } from './localization-build.mjs';
import { renderSiteHeader } from './navigation-view.mjs';

const reference = readFileSync(new URL('./design-reference.jsx', import.meta.url), 'utf8');
const assets = JSON.parse(readFileSync(new URL('./asset-manifest.json', import.meta.url), 'utf8'));
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const fixed = {
  absolute: 'position:absolute', relative: 'position:relative', block: 'display:block',
  flex: 'display:flex', 'flex-none': 'flex:none', 'items-center': 'align-items:center',
  'justify-center': 'justify-content:center', border: 'border-width:1px',
  'border-solid': 'border-style:solid', 'h-px': 'height:1px', 'w-px': 'width:1px',
  'inset-0': 'inset:0', 'size-full': 'width:100%;height:100%',
  'max-w-none': 'max-width:none', 'object-cover': 'object-fit:cover', 'object-contain': 'object-fit:contain',
  'pointer-events-none': 'pointer-events:none', 'overflow-clip': 'overflow:clip',
  'opacity-22': 'opacity:.22', 'mb-0': 'margin-bottom:0',
  'not-italic': 'font-style:normal', 'font-normal': 'font-weight:400',
  'font-medium': 'font-weight:500', 'font-semibold': 'font-weight:600',
  'font-bold': 'font-weight:700', 'text-white': 'color:#fff', 'text-black': 'color:#000',
  'whitespace-nowrap': 'white-space:nowrap', 'whitespace-pre': 'white-space:pre',
  'whitespace-pre-wrap': 'white-space:pre-wrap', '-rotate-90': 'transform:rotate(-90deg)',
  '[word-break:break-word]': 'overflow-wrap:break-word',
};
// Only generated UI colors are tokenized; project illustrations restore their own palette.
function colorToken(value, purpose) {
  const palette = { '#f5f3ea':'page', '#faf8f1':'surface', '#cad6d1':'border', '#092328':'text', '#657774':'muted', '#12544f':purpose === 'bg' ? 'primary' : 'accent', '#2a835f':purpose === 'bg' ? 'primary' : 'highlight', '#8bbb92':'sage' };
  return palette[value] ? `var(--theme-${palette[value]}, ${value})` : value;
}
function declaration(token) {
  if (fixed[token]) return fixed[token];
  if (token.startsWith("font-['Inter:")) return "font-family:Inter,sans-serif";
  const match = token.match(/^([a-z-]+)-\[(.+)\]$/);
  if (!match) throw new Error(`Unknown reference style: ${token}`);
  const [, prefix, value] = match;
  const properties = { bg:'background-color', border:'border-color', h:'height', w:'width', left:'inset-inline-start', top:'top', rounded:'border-radius', leading:'line-height' };
  if (prefix === 'text') return `${value.startsWith('#') ? 'color' : 'font-size'}:${value.startsWith('#') ? colorToken(value, 'text') : value}`;
  if (prefix === 'size') return `width:${value};height:${value}`;
  if (prefix === 'drop-shadow') return `filter:drop-shadow(${value.replaceAll('_', ' ')})`;
  if (properties[prefix]) return `${properties[prefix]}:${colorToken(value, prefix)}`;
  throw new Error(`Unknown reference style: ${token}`);
}
const rules = new Map();
let html = reference.slice(reference.indexOf('  return (') + 11, reference.lastIndexOf('  );')).trim();
html = html.replace('<ContactSection />', renderContact()).replace('<SiteFooter />', renderFooter()).replace('<HeroSocialRail />', renderHeroSocialRail());
html = html.replace(/\{`([^`]*)`\}/g, (_, text) => escape(text));
for (const asset of assets) html = html.replaceAll(`src={${asset.name}}`, `src="./assets/${asset.file}"`);
html = html.replace(/className="([^"]*)"/g, (_, classes) => {
  const style = classes.split(' ').map(declaration).join(';');
  if (!rules.has(style)) rules.set(style, `layer-${rules.size}`);
  return `class="${rules.get(style)}"`;
});
html = html.replace(/<div([^>]*?)\s*\/>/g, '<div$1></div>');
html = html.replace(/>\s*\n\s*([^<\n]+)\s*\n\s*</g, (_, text) => `>${text.trim()}<`);
html = html.replace('data-node-id="1:15"', 'id="portfolio" data-node-id="1:15"');
html = localizeMarkup(html);
const css = `@font-face{font-family:Inter;src:url('./assets/InterVariable.woff2') format('woff2');font-style:normal;font-weight:100 900;font-display:block}\n*{box-sizing:border-box;border-width:0;border-style:solid}html,body{margin:0;padding:0;background:var(--theme-page,#f5f3ea)}body{font-family:Inter,sans-serif;line-height:normal}p{margin:0}img{display:block;vertical-align:middle}#viewport{width:min(100%,1440px);margin:0 auto}#portfolio{width:1440px;height:3440px;transform-origin:top left;zoom:var(--scale,1)}\n` + [...rules].map(([style,name]) => `.${name}{${style}}`).join('\n');
mkdirSync(new URL('./dist', import.meta.url), {recursive:true});
mkdirSync(new URL('./dist/assets', import.meta.url), {recursive:true});
mkdirSync(new URL('./dist/vendor', import.meta.url), {recursive:true});
mkdirSync(new URL('./dist/assets/fonts', import.meta.url), {recursive:true});
for (const weight of ['Regular', 'Medium', 'SemiBold', 'Bold']) {
  const file = `KalamehWeb-${weight}.woff2`;
  copyFileSync(new URL(`./fonts/${file}`, import.meta.url), new URL(`./dist/assets/fonts/${file}`, import.meta.url));
}
for (const file of ['lenis.min.js', 'lenis.css']) {
  copyFileSync(new URL(`./node_modules/lenis/dist/${file}`, import.meta.url), new URL(`./dist/vendor/${file}`, import.meta.url));
}
for (const file of ['aein-barbers-cover.jpg', 'contact-sage.svg', 'contact-teal.svg']) {
  copyFileSync(new URL(`./artwork/${file}`, import.meta.url), new URL(`./dist/assets/${file}`, import.meta.url));
}
writeFileSync(new URL('./dist/styles.css', import.meta.url), css + '\n' + readFileSync(new URL('./hero-motion.css', import.meta.url), 'utf8') + '\n' + readFileSync(new URL('./contact.css', import.meta.url), 'utf8') + '\n' + readFileSync(new URL('./i18n.css', import.meta.url), 'utf8') + '\n' + readFileSync(new URL('./mobile.css', import.meta.url), 'utf8') + '\n' + readFileSync(new URL('./theme.css', import.meta.url), 'utf8'));
writeFileSync(new URL('./dist/index.html', import.meta.url), `<!doctype html>\n<html lang="en" data-theme="light"><head><meta charset="utf-8"><script>try{if(localStorage.getItem("portfolio-theme")==="dark")document.documentElement.dataset.theme="dark"}catch{}</script><meta name="viewport" content="width=device-width, initial-scale=1"><title>Aein Meraji — Portfolio</title><link rel="stylesheet" href="./vendor/lenis.css"><link rel="stylesheet" href="./styles.css"></head><body><main id="viewport" aria-label="Aein Meraji portfolio" data-i18n-aria-label="a11y.portfolio">${renderSiteHeader()}${html}</main><script src="./vendor/lenis.min.js"></script><script type="module" src="./presentation.js"></script><script type="module" src="./contact.js"></script></body></html>\n`);
writeFileSync(new URL('./dist/presentation.js', import.meta.url), readFileSync(new URL('./presentation.js', import.meta.url), 'utf8'));
for (const file of ['contact.js', 'i18n.js', 'translations.js', 'navigation.js', 'theme.js']) {
  copyFileSync(new URL(`./${file}`, import.meta.url), new URL(`./dist/${file}`, import.meta.url));
}
console.log(`Built ${rules.size} CSS rules and ${assets.length} local asset references.`);
