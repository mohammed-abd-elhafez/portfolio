// Static site build. No dependencies, Node 18+.
//   src/pages/*.html        -> dist/*.html
//   src/templates/project.html + src/data/projects.json -> dist/projects/<slug>.html
//   src/css, src/js         -> dist/css, dist/js
//   public/*                -> dist/ (copied as is)
//   sitemap.xml             -> generated from the pages above
//
// Template syntax inside HTML files:
//   <!-- @include name -->   inserts src/partials/name.html
//   {{site.name}}            value from src/data/site.json (HTML-escaped)
//   {{p.title}}              value from the current project (project pages only)
//   {{{projectRows}}}        raw, pre-built HTML (not escaped)

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
const basePath = site.base || '/';
const internal = (path) => `${basePath}${String(path).replace(/^\//, '')}`;

// ---------------------------------------------------------------- html fragments
const projectRows = projects
  .map(
    (p) => `      <a class="row" href="${esc(internal(`/projects/${p.slug}.html`))}" style="--c1:${esc(p.c1)};--c2:${esc(p.c2)}">
        <div><h3>${esc(p.title)}</h3><p class="what">${esc(p.tagline)}</p></div>
        <ul class="tags">${p.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        <div class="tile ${esc(p.tile)}"><i></i></div>
      </a>`
  )
  .join('\n');

const processHtml = (p) =>
  `<ol class="steps">${p.process
    .map((s) => `<li><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`)
    .join('')}</ol>`;

const stackHtml = (p) => `<ul class="tags">${p.stack.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`;

const nextHtml = (i) => {
  const n = projects[(i + 1) % projects.length];
  return `<a class="next" href="${esc(internal(`/projects/${n.slug}.html`))}" style="--c1:${esc(n.c1)};--c2:${esc(n.c2)}">
      <span class="note">Next project</span>
      <strong>${esc(n.title)}</strong>
    </a>`;
};

const linksHtml = (p) => `<p class="project-links">${p.liveUrl ? `<a href="${esc(p.liveUrl)}" target="_blank" rel="noopener">Live project</a>` : ''}${p.liveUrl && p.repoUrl ? ' · ' : ''}${p.repoUrl ? `<a href="${esc(p.repoUrl)}" target="_blank" rel="noopener">GitHub repository</a>` : ''}</p>`;

// ---------------------------------------------------------------- build
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

const urls = [];

// 1. standalone pages
for (const file of readdirSync(join(SRC, 'pages')).filter((f) => f.endsWith('.html'))) {
  const path = file === 'index.html' ? '/' : `/${file}`;
  const ctx = { site, year, page: { path }, projectRows };
  write(join(DIST, file), render(read(join(SRC, 'pages', file)), ctx, `pages/${file}`));
  if (file !== '404.html') urls.push(path);
}

// 2. project pages
const template = read(join(SRC, 'templates', 'project.html'));
projects.forEach((p, i) => {
  const path = `/projects/${p.slug}.html`;
  const ctx = {
    site,
    year,
    page: { path },
    p,
    processHtml: processHtml(p),
    stackHtml: stackHtml(p),
    nextHtml: nextHtml(i),
    linksHtml: linksHtml(p),
  };
  write(join(DIST, 'projects', `${p.slug}.html`), render(template, ctx, `projects/${p.slug}`));
  urls.push(path);
});

// 3. assets
cpSync(join(SRC, 'css'), join(DIST, 'css'), { recursive: true });
cpSync(join(SRC, 'js'), join(DIST, 'js'), { recursive: true });
if (existsSync(join(ROOT, 'public'))) cpSync(join(ROOT, 'public'), DIST, { recursive: true });

// 4. sitemap
const base = site.url.replace(/\/$/, '');
write(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${base}${u}</loc></url>`)
    .join('\n')}\n</urlset>\n`
);

console.log(`Built ${urls.length} pages into dist/`);
if (!site.name || !site.url || !site.base) throw new Error('site.json must define name, url and base');
if (projects.length === 0) throw new Error('projects.json must contain at least one project');
for (const p of projects) {
  if (p.sample || /replace this|your name|yourdomain/i.test(JSON.stringify(p))) {
    throw new Error(`Placeholder text remains in project ${p.slug}`);
  }
}
