// Dev server: rebuilds dist/ when files in src/ or public/ change and serves it.
// Usage: npm run dev   (PORT=8080 npm run dev to change the port)

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const PORT = Number(process.env.PORT) || 5173;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

const build = () => {
  const r = spawnSync(process.execPath, [join(ROOT, 'scripts', 'build.mjs')], { stdio: 'inherit' });
  if (r.status !== 0) console.error('Build failed. Fix the error above and save again.');
};

build();

let timer;
for (const dir of ['src', 'public']) {
  try {
    watch(join(ROOT, dir), { recursive: true }, () => {
      clearTimeout(timer);
      timer = setTimeout(build, 120);
    });
  } catch {
    console.warn(`Could not watch ${dir}/. Restart the server after edits.`);
  }
}

const send = async (res, file, status = 200) => {
  const body = await readFile(file);
  res.writeHead(status, {
    'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  res.end(body);
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
    let file = join(DIST, rel);
    if (!file.startsWith(DIST)) throw new Error('outside dist');
    try {
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    } catch {
      if (!extname(file)) file += '.html';
    }
    await send(res, file);
  } catch {
    try {
      await send(res, join(DIST, '404.html'), 404);
    } catch {
      res.writeHead(404).end('Not found');
    }
  }
}).listen(PORT, () => console.log(`Dev server: http://localhost:${PORT}`));
