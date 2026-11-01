// Static site build. No dependencies, Node 18+.
//   src/pages/*.html                              -> dist/<page> and dist/ar/<page>
//   src/templates/project.html + projects.json    -> dist/projects/<slug>.html and dist/ar/projects/<slug>.html
//   src/css, src/js                               -> dist/css, dist/js
//   public/*                                      -> dist/ (copied as is)
//   sitemap.xml                                   -> generated
//
// Template syntax:
//   <!-- @include name -->   inserts src/partials/name.html
//   {{t.key}}                locale string from site.json i18n (escaped)
//   {{site.key}} {{p.key}}   site / project values (escaped)
//   {{{raw}}}                pre-built HTML (not escaped)

import { readFileSync, writeFileSync, mkdirSync, readdirSync, cpSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');

const read = (p) => readFileSync(p, 'utf8');
const readJSON = (p) => JSON.parse(read(p));
const write = (p, content) => {
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content);
};
const esc = (v) =>
  String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const lookup = (ctx, path, where) => {
  const value = path.split('.').reduce((a, k) => (a == null ? undefined : a[k]), ctx);
  if (value === undefined || value === null) throw new Error(`Missing value "${path}" in ${where}`);
  return value;
};

function render(html, ctx, where) {
  let out = html;
  for (let depth = 0; depth < 4 && /<!--\s*@include\s+/.test(out); depth++) {
    out = out.replace(/<!--\s*@include\s+([\w-]+)\s*-->/g, (_, name) => {
      const file = join(SRC, 'partials', `${name}.html`);
      if (!existsSync(file)) throw new Error(`Missing partial "${name}" in ${where}`);
      return read(file).trimEnd();
    });
  }
  out = out.replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_, k) => String(lookup(ctx, k, where)));
  out = out.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => esc(lookup(ctx, k, where)));
  return out;
}

// ---------------------------------------------------------------- data
const site = readJSON(join(SRC, 'data', 'site.json'));
const projects = readJSON(join(SRC, 'data', 'projects.json'));
const year = new Date().getFullYear();
const BASE = site.base;
const LOCALES = ['en', 'ar'];
const root = (lang) => (lang === 'en' ? BASE : `${BASE}ar/`);
const img = (name) => `${BASE}img/work/${name}`;

// Arabic view of a project: Arabic fields over the English ones.
const localize = (p, lang) => (lang === 'ar' ? { ...p, ...p.ar } : p);

const arrow = `<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ext = `<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><path d="M7 5h8v8M15 5 5 15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// ---------------------------------------------------------------- fragments
const statusHtml = (p) => (p.status ? `<span class="status">${esc(p.status)}</span>` : '');

const workRows = (lang, t) =>
  projects
    .map((raw, i) => {
      const p = localize(raw, lang);
      return `      <li class="work-row">
        <a href="${esc(root(lang))}projects/${esc(p.slug)}.html" data-tex="${esc(img(`${p.slug}-tex.jpg`))}">
          <span class="work-n">${String(i + 1).padStart(2, '0')}</span>
          <span class="work-text">
            <span class="work-title"><span class="work-name">${esc(p.title)}</span><span class="work-sub">${esc(p.subtitle)}</span></span>
            <span class="work-tag">${esc(p.tagline)}</span>
            <span class="work-meta">${p.tags.map((x) => `<span>${esc(x)}</span>`).join('')}${statusHtml(p)}</span>
          </span>
          <img class="work-img" src="${esc(img(`${p.slug}.webp`))}" alt="" width="1600" height="1000" loading="lazy" decoding="async">
          <span class="work-go" aria-hidden="true">${arrow}</span>
        </a>
      </li>`;
    })
    .join('\n');

const galleryData = (lang) =>
  JSON.stringify(
    projects.map((raw) => {
      const p = localize(raw, lang);
      return {
        title: p.title,
        sub: p.subtitle,
        tags: p.tags,
        status: p.status || '',
        tex: img(`${p.slug}-tex.jpg`),
        src: img(`${p.slug}.webp`),
        href: `${root(lang)}projects/${p.slug}.html`,
      };
    })
  ).replace(/</g, '\\u003c');

const fallbackSlides = (lang) =>
  projects
    .map((raw) => {
      const p = localize(raw, lang);
      return `<li><a href="${esc(root(lang))}projects/${esc(p.slug)}.html"><img src="${esc(img(`${p.slug}.webp`))}" alt="${esc(p.title)}: ${esc(p.subtitle)}" width="1600" height="1000" decoding="async"><span>${esc(p.title)}</span></a></li>`;
    })
    .join('');

const processHtml = (p) =>
  `<ol class="steps">${p.process
    .map((s) => `<li><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`)
    .join('')}</ol>`;

const stackHtml = (p) => `<ul class="chips">${p.stack.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`;

const linksHtml = (p, t) =>
  `<p class="case-links">${
    p.liveUrl ? `<a class="btn btn-solid" href="${esc(p.liveUrl)}" target="_blank" rel="noopener">${esc(t.caseLive)} ${ext}</a>` : ''
  }${p.repoUrl ? `<a class="btn" href="${esc(p.repoUrl)}" target="_blank" rel="noopener">${esc(t.caseRepo)} ${ext}</a>` : ''}</p>`;

const screensHtml = (p, lang) => {
  const shots = [];
  if (p.detail) shots.push(`<figure class="shot shot-wide"><img src="${esc(img(`${p.slug}-detail.webp`))}" alt="" loading="lazy" decoding="async"></figure>`);
  shots.push(`<figure class="shot shot-phone"><img src="${esc(img(`${p.slug}-mobile.webp`))}" alt="" loading="lazy" decoding="async"></figure>`);
  if (p.slug === 'nawa-landing') {
    shots.push(`<figure class="shot shot-phone"><img src="${esc(img('nawa-landing-ar-mobile.webp'))}" alt="" loading="lazy" decoding="async"></figure>`);
    shots.push(`<figure class="shot shot-wide"><img src="${esc(img('nawa-landing-ar.webp'))}" alt="" loading="lazy" decoding="async"></figure>`);
  }
  return `<div class="shots">${shots.join('')}</div>`;
};

const nextHtml = (i, lang, t) => {
  const n = localize(projects[(i + 1) % projects.length], lang);
  return `<a class="next" href="${esc(root(lang))}projects/${esc(n.slug)}.html">
      <span class="next-label">${esc(t.caseNext)}</span>
      <span class="next-title">${esc(n.title)} <span>${esc(n.subtitle)}</span></span>
      <img src="${esc(img(`${n.slug}.webp`))}" alt="" loading="lazy" decoding="async">
    </a>`;
};

// ---------------------------------------------------------------- build
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
const urls = [];

const common = (lang, path) => {
  const t = site.i18n[lang];
  const other = t.switchLang;
  return {
    site,
    year,
    t,
    L: root(lang),
    page: { path: `${lang === 'en' ? '' : 'ar/'}${path}` },
    alt: { href: `${root(other)}${path}` },
    altEn: `${site.url}/${path}`,
    altAr: `${site.url}/ar/${path}`,
  };
};

for (const lang of LOCALES) {
  const t = site.i18n[lang];
  const out = lang === 'en' ? DIST : join(DIST, 'ar');

  for (const file of readdirSync(join(SRC, 'pages')).filter((f) => f.endsWith('.html'))) {
    const path = file === 'index.html' ? '' : file;
    const ctx = {
      ...common(lang, path),
      workRows: workRows(lang, t),
      galleryData: galleryData(lang),
      fallbackSlides: fallbackSlides(lang),
      mail: `mailto:${site.email}`,
    };
    write(join(out, file), render(read(join(SRC, 'pages', file)), ctx, `pages/${file} (${lang})`));
    if (file !== '404.html') urls.push(ctx.page.path);
  }

  const template = read(join(SRC, 'templates', 'project.html'));
  projects.forEach((raw, i) => {
    const p = localize(raw, lang);
    const path = `projects/${p.slug}.html`;
    const ctx = {
      ...common(lang, path),
      p,
      cover: img(`${p.slug}.webp`),
      statusHtml: statusHtml(p),
      processHtml: processHtml(p),
      stackHtml: stackHtml(p),
      linksHtml: linksHtml(p, t),
      screensHtml: screensHtml(p, lang),
      nextHtml: nextHtml(i, lang, t),
      mail: `mailto:${site.email}`,
    };
    write(join(out, path), render(template, ctx, `${path} (${lang})`));
    urls.push(ctx.page.path);
  });
}

cpSync(join(SRC, 'css'), join(DIST, 'css'), { recursive: true });
cpSync(join(SRC, 'js'), join(DIST, 'js'), { recursive: true });
if (existsSync(join(ROOT, 'public'))) cpSync(join(ROOT, 'public'), DIST, { recursive: true });

const base = site.url.replace(/\/$/, '');
write(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${base}/${u}</loc></url>`)
    .join('\n')}\n</urlset>\n`
);

console.log(`Built ${urls.length} pages into dist/`);
if (!site.name || !site.url || !site.base || !site.email) throw new Error('site.json must define name, url, base and email');
for (const p of projects) {
  for (const k of ['title', 'subtitle', 'tagline', 'problem', 'result']) {
    if (!p[k] || !p.ar?.[k === 'subtitle' ? 'subtitle' : k]) throw new Error(`Project ${p.slug} is missing ${k} (en or ar)`);
  }
  for (const f of [`${p.slug}.webp`, `${p.slug}-tex.jpg`, `${p.slug}-mobile.webp`].concat(p.detail ? [`${p.slug}-detail.webp`] : [])) {
    if (!existsSync(join(ROOT, 'public', 'img', 'work', f))) throw new Error(`Missing image ${f}`);
  }
}
