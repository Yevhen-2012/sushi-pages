import fs from 'node:fs/promises';
import path from 'node:path';

// Run from the repository root after extracting the Webflow ZIP.
// CMS snapshots live in .migration/ and are deliberately excluded from Git.
const read = name => fs.readFile(name, 'utf8');
const source = JSON.parse((await read('.migration/cms-source.json')).replace(/^\uFEFF/, ''));
const active = rows => rows.filter(row => row.Draft === 'false' && row.Archived === 'false');
const escape = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const blogs = active(source.blogs).sort((a, b) => new Date(b.date) - new Date(a.date));
function elements(html, className) {
  const result = [];
  const tags = /<([a-z][\w-]*)\b[^>]*>/gi;
  let match;
  while ((match = tags.exec(html))) {
    const classes = /\bclass="([^"]*)"/.exec(match[0])?.[1].split(/\s+/) ?? [];
    if (!classes.includes(className)) continue;
    let end = tags.lastIndex;
    if (!['img', 'input', 'link', 'meta', 'br', 'hr'].includes(match[1])) {
      const nested = new RegExp(`<(/?)${match[1]}\\b[^>]*>`, 'gi');
      nested.lastIndex = end;
      let depth = 1;
      let tag;
      while (depth && (tag = nested.exec(html))) {
        depth += tag[1] ? -1 : 1;
        end = nested.lastIndex;
      }
      if (depth) throw new Error(`Unclosed ${className}`);
    }
    result.push({ start: match.index, end, html: html.slice(match.index, end) });
    tags.lastIndex = end;
  }
  return result;
}
function replaceElement(html, className, replacement) {
  const [element] = elements(html, className);
  if (!element) throw new Error(`Missing ${className}`);
  return html.slice(0, element.start) + replacement + html.slice(element.end);
}
const pages = new Map();
for (const filename of ['index.html', 'menu.html', 'about.html', 'reservation.html', 'contact.html', 'blog.html']) {
  pages.set(filename, await read(`.migration/export/${filename}`));
}
for (const [name, className] of [['menu', 'menu_collection-list-wraper'], ['blog', 'blog_collection-list-wraper']]) {
  let live = elements(await read(`.migration/sushi-live-${name}.html`), className);
  if (name === 'menu') {
    for (const [i, key] of ['makis', 'uramakis', 'specialRolls'].entries()) {
      const candidates = elements(live[i].html, 'menu_collection-item');
      const order = row => candidates.findIndex(item => item.html.includes(escape(row.Name.trim())));
      const rows = active(source[key]).sort((a, b) => order(a) - order(b));
      const cards = rows.map(row => {
        let card = candidates.find(item => item.html.includes(escape(row.Name.trim())))?.html;
        if (!card) throw new Error(`No exported card for ${row.Name}`);
        card = replaceElement(card, 'h5-menu', `<h5 class="h5-menu">${escape(row.Name)}</h5>`);
        card = replaceElement(card, 'h5', `<div class="h5">${escape(Number(row.Price).toFixed(1))}</div>`);
        card = replaceElement(card, 'text_small', `<div class="text_small">${escape(row.description)}</div>`);
        const currentImage = /<img[^>]*src="([^"]+)"/.exec(card)?.[1];
        if (currentImage !== row.Image) card = card.replace(/<img[^>]*>/, `<img src="${escape(row.Image)}" loading="lazy" alt="${escape(row.Name)}" class="menu_main-img">`);
        return card;
      }).join('');
      live[i].html = `<div class="menu_collection-list-wraper w-dyn-list"><div role="list" class="menu_collection-list w-dyn-items">${cards}</div></div>`;
    }
  } else {
    const candidates = elements(live[0].html, 'blog_content-grid');
    const cards = blogs.map(row => {
      let card = candidates.find(item => item.html.includes(`/blog/${row.Slug}`))?.html;
      if (!card) throw new Error(`No exported blog card for ${row.Slug}`);
      card = replaceElement(card, 'h4', `<h4 class="h4 capitalize-text margin-s">${escape(row.Name)}</h4>`);
      const summary = elements(card, 'text_medium').at(-1);
      card = card.slice(0, summary.start) + `<div class="text_medium">${escape(row['Post Summary'])}</div>` + card.slice(summary.end);
      return card;
    }).join('');
    live[0].html = `<div class="blog_collection-list-wraper w-dyn-list"><div role="list" class="blog_collection-list w-dyn-items">${cards}</div></div>`;
  }
  let html = pages.get(`${name}.html`);
  const exported = elements(html, className);
  if (live.length !== exported.length) throw new Error(`CMS list mismatch: ${name}`);
  for (let i = exported.length - 1; i >= 0; i--) {
    html = html.slice(0, exported[i].start) + live[i].html + html.slice(exported[i].end);
  }
  pages.set(`${name}.html`, html);
}
const slugs = blogs.map(row => row.Slug);
const template = await read('.migration/export/detail_blog.html');
for (const slug of slugs) {
  const live = await read(`.migration/${slug}.html`);
  let html = replaceElement(template, 'hero_img-wraper-2', elements(live, 'hero_img-wraper-2')[0].html);
  html = replaceElement(html, 'blog_wrapper-inner', elements(live, 'blog_wrapper-inner')[0].html);
  const row = blogs.find(row => row.Slug === slug);
  if (/<script\b|\bon\w+\s*=/i.test(row['Post Body'])) throw new Error(`Unsafe rich text: ${slug}`);
  html = replaceElement(html, 'content_post-body', `<div class="content_post-body w-richtext">${row['Post Body']}</div>`);
  html = html.replace(/<h1 class="capitalize-text text-center margin-m">.*?<\/h1>/, `<h1 class="capitalize-text text-center margin-m">${escape(row.Name)}</h1>`);
  const title = escape(row.Name);
  html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
  pages.set(`blog/${slug}/index.html`, html);
}
const downloads = new Map([
  ['https://d3e54v103j8qbb.cloudfront.net/js/jquery-3.5.1.min.dc5e7f18c8.js', 'js/vendor/jquery-3.5.1.min.js'],
  ['https://cdn.prod.website-files.com/gsap/3.15.0/gsap.min.js', 'js/vendor/gsap.min.js'],
  ['https://cdn.prod.website-files.com/gsap/3.15.0/Flip.min.js', 'js/vendor/Flip.min.js'],
]);
const cmsURLs = new Set();
for (const html of pages.values()) {
  for (const [url] of html.matchAll(/https:\/\/cdn\.prod\.website-files\.com\/[^"\s<>]+/g)) {
    if (!url.includes('/gsap/')) cmsURLs.add(url);
  }
}
for (const url of cmsURLs) {
  const basename = path.posix.basename(new URL(url).pathname);
  downloads.set(url, `images/cms/${decodeURIComponent(basename).replace(/[^\w.-]/g, '_')}`);
}
if (process.argv.includes('--manifest-only')) {
  await fs.writeFile('.migration/dependencies.json', JSON.stringify([...downloads].map(([url, filename]) => ({ url, filename })), null, 2));
  console.log(`Prepared download manifest for ${downloads.size} files.`);
  process.exit(0);
}
const jobs = [...downloads];
let completed = 0;
await Promise.all(Array.from({ length: 5 }, async () => {
  while (jobs.length) {
    const [url, filename] = jobs.shift();
    await fs.mkdir(path.dirname(filename), { recursive: true });
    try { await fs.access(filename); }
    catch {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${response.status}: ${url}`);
      await fs.writeFile(filename, Buffer.from(await response.arrayBuffer()));
    }
    completed++;
  }
}));
for (let [filename, html] of pages) {
  for (const [url, local] of downloads) html = html.replaceAll(url, local);
  html = html.replace(/js\/vendor\/jquery-3\.5\.1\.min\.js\?site=[^"]+/g, 'js/vendor/jquery-3.5.1.min.js');
  html = html.replace(/https:\/\/cdn\.jsdelivr\.net\/gh\/Yevhen-2012\/sushi@[^/]+\/sushi\.js/g, 'js/sushi.js');
  html = html.replace(/href="\/blog\/([\w-]+)"/g, 'href="blog/$1/"');
  html = html.replace(/<meta content="Webflow" name="generator">\s*/, '');
  html = html.replace(/<link href="images\/favicon.webp" rel="shortcut icon" type="image\/x-icon">/, '<link href="images/favicon.webp" rel="icon" type="image/webp">');
  if (filename === 'reservation.html') {
    html = html.replace('<form id="email-form"', '<form aria-describedby="reservation-note" id="email-form"');
    html = html.replace(/<input type="submit"[^>]*>/, '<input type="submit" class="reservation__button w-button" value="Reservations unavailable online" disabled aria-disabled="true">');
    html = html.replace('</form>', '</form>\n<p id="reservation-note" class="text_small" role="note">This form does not send requests. To book a table, please <a href="tel:613-217-2746">call 613-217-2746</a> or <a href="mailto:info@sushinami.ca">email info@sushinami.ca</a>.</p>');
    html = html.replace('<script src="js/sushi.js"', '<script src="js/reservation.js" defer></script>\n  <script src="js/sushi.js"');
    // Unique names and IDs are required even while submission is disabled.
    const fields = [
      ['Guests', 'guests', 'number', ' min="1" step="1"'],
      ['Date', 'date', 'date', ''],
      ['Time', 'time', 'time', ''],
    ];
    for (const [label, name, type, extra] of fields) {
      html = html.replace(new RegExp(`<input[^>]*placeholder="${label}"[^>]*>`), `<input class="reservation__text-field w-input" name="${name}" placeholder="${label}" aria-label="${label}" type="${type}" id="${name}" required${extra}>`);
    }
  }
  // Relative URLs work both at / and at GitHub Pages' /sushi-pages/ prefix.
  if (filename.startsWith('blog/')) {
    html = html.replace(/\b(href|src)="(?![a-z]+:|#|\/)([^"]+)"/gi, '$1="../../$2"');
    html = html.replace(/\bsrcset="([^"]+)"/g, (_, value) => `srcset="${value.split(',').map(part => '../../' + part.trim()).join(', ')}"`);
  }
  await fs.mkdir(path.dirname(filename), { recursive: true });
  await fs.writeFile(filename, html);
}
console.log(`Prepared ${pages.size} pages, ${slugs.length} articles and ${completed} local dependencies.`);
await fs.mkdir('content', { recursive: true });
await fs.writeFile('content/cms.json', JSON.stringify({
  source: 'Owner-provided Webflow CSV exports',
  blogs: blogs.map(row => ({ name: row.Name, slug: row.Slug, body: row['Post Body'], summary: row['Post Summary'], image: downloads.get(row['Main Image']), date: row.date })),
  menu: Object.fromEntries(['makis', 'uramakis', 'specialRolls'].map(key => [key, active(source[key]).map(row => ({ name: row.Name, slug: row.Slug, price: Number(row.Price), description: row.description, image: downloads.get(row.Image) }))])),
}, null, 2));
