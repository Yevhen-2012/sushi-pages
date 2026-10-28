import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const files = ['index.html', 'menu.html', 'about.html', 'reservation.html', 'contact.html', 'blog.html'];
const cms = JSON.parse(await fs.readFile('content/cms.json', 'utf8'));
for (const blog of cms.blogs) files.push(`blog/${blog.slug}/index.html`);
let links = 0;
const failures = [];
async function checkURL(filename, value) {
  if (/^(?:[a-z]+:|#|\/\/)/i.test(value)) return;
  if (value.startsWith('/')) { failures.push(`${filename}: root-relative URL ${value}`); return; }
  const local = decodeURIComponent(value.split(/[?#]/)[0]);
  const resolved = path.resolve(path.dirname(filename), local || '.');
  if (!resolved.startsWith(root + path.sep) && resolved !== root) { failures.push(`${filename}: URL outside site ${value}`); return; }
  try {
    const stat = await fs.stat(resolved);
    if (stat.isDirectory()) await fs.access(path.join(resolved, 'index.html'));
    links++;
  } catch { failures.push(`${filename}: missing ${value}`); }
}
for (const file of files) {
  const html = await fs.readFile(file, 'utf8');
  assert(!html.includes('w-dyn-bind-empty'), `${file}: empty CMS binding`);
  assert(!html.includes('w-dyn-empty'), `${file}: empty CMS list`);
  assert(!/<script[^>]+src="https?:/.test(html), `${file}: remote runtime dependency`);
  assert(!/<img[^>]+src="https?:/.test(html), `${file}: remote image`);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, `${file}: duplicate HTML IDs`);
  for (const match of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) await checkURL(file, match[1]);
  for (const match of html.matchAll(/\bsrcset="([^"]+)"/g)) {
    for (const candidate of match[1].split(',')) await checkURL(file, candidate.trim().split(/\s+/)[0]);
  }
}
for (const file of ['css/normalize.css', 'css/webflow.css', 'css/sushi-7096b4.webflow.css']) {
  const css = await fs.readFile(file, 'utf8');
  for (const match of css.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g)) await checkURL(file, match[1]);
}
const menu = await fs.readFile('menu.html', 'utf8');
for (const item of Object.values(cms.menu).flat()) {
  assert(menu.includes(item.name), `Missing menu item ${item.name}`);
  assert(menu.includes(item.description), `Missing description ${item.name}`);
}
assert.equal((menu.match(/class="menu_collection-item w-dyn-item"/g) ?? []).length, 15);
assert.equal(cms.blogs.length, 4);
const reservation = await fs.readFile('reservation.html', 'utf8');
assert(reservation.includes('disabled aria-disabled="true"'));
assert(reservation.includes('This form does not send requests.'));
assert(reservation.includes('js/reservation.js'));
if (failures.length) throw new Error(failures.join('\n'));
console.log(`PASS: ${files.length} pages, ${links} local references, 15 menu items, 4 published articles; form submission disabled.`);
