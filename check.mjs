import { readFileSync, statSync } from 'node:fs';
import assert from 'node:assert/strict';
import { contact } from './contact-view.mjs';
const local = path => new URL(path, import.meta.url);
const reference = readFileSync(local('design-reference.jsx'), 'utf8');
const html = readFileSync(local('dist/index.html'), 'utf8');
const assets = JSON.parse(readFileSync(local('asset-manifest.json'), 'utf8'));
const ids = text => [...text.matchAll(/data-node-id="([^"]+)"/g)].map(match => match[1]);
assert.deepEqual(ids(html), ids(reference), 'Every original design layer must be preserved in order.');
assert.equal((html.match(/<img\b/g) || []).length, (reference.match(/<img\b/g) || []).length + 4);
assert(!/src=\{|className=|https:\/\/www\.figma\.com\/api\/mcp\/asset/.test(html), 'The page must use local static HTML and assets.');
assert(html.includes(`action="https://formsubmit.co/${contact.email}"`), 'Contact submissions must target the configured inbox.');
for (const name of ['name', 'email', 'project_type', 'message']) {
  assert(new RegExp(`<(?:input|select|textarea)\\b[^>]*name="${name}"[^>]*required`).test(html), `${name} must be a required form field.`);
}
const links = [...html.matchAll(/<a\b[^>]*>/g)].map(match => match[0]);
const projectLinks = links.filter(link => /href="https:\/\/[^\"]+\.vercel\.app\//.test(link));
assert.equal(projectLinks.length, 2, 'KalaBox and Aein Barbers must link to their live projects.');
assert(projectLinks[0].includes('href="https://online-shop-tawny-pi.vercel.app/"'));
assert(projectLinks[1].includes('href="https://barber-shop-omega-self.vercel.app/"'));
assert(projectLinks[1].includes('target="_blank"') && projectLinks[1].includes('rel="noopener noreferrer"'));
const destinations = {'1:17': 'home', '1:20': 'services', '1:19': 'works', '1:21': 'contact', '1:29': 'works', '1:30': 'contact'};
for (const [node, destination] of Object.entries(destinations)) {
  const link = links.find(link => link.includes(`data-node-id="${node}"`));
  assert(link?.includes(`href="#${destination}"`), `${node} must link to ${destination}.`);
  assert(html.includes(`id="${destination}" tabindex="-1"`), `${destination} must be a focusable navigation destination.`);
}
console.log('Verified all six homepage navigation links and their destinations.');
let missing = [];
for (const file of [...assets.map(asset => asset.file), 'aein-barbers-cover.jpg', 'contact-sage.svg', 'contact-teal.svg', 'InterVariable.woff2']) {
  try { assert(statSync(local(`dist/assets/${file}`)).size > 0); }
  catch { missing.push(file); }
}
console.log(`Verified ${ids(html).length} Figma layers and all image callsites in the static HTML.`);
if (missing.length) {
  console.error(`Incomplete: ${missing.length} original assets are not yet available locally: ${missing.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log(`Verified ${assets.length} original image/vector assets and the Inter font.`);
}
