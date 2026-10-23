// Сборка всех сетей: vite build → склейка в один HTML → проверки требований → manifest.json → витрина.
// Любая непройденная проверка роняет сборку: в CI на Pages не уйдёт файл, который сеть отклонит.
import { build } from 'vite';
import { readFile, writeFile, rm, readdir, mkdir, copyFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
import { NETWORKS, BUDGET } from '../src/config.js';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const DIST = join(ROOT, 'dist');

await rm(DIST, { recursive: true, force: true });
const report = [];

for (const network of NETWORKS) {
  await build({ root: ROOT, mode: network, logLevel: 'warn' });
  const dir = join(DIST, 'play', network);
  const html = await inline(dir);
  const file = join(dir, 'index.html');
  await writeFile(file, html);
  await rm(join(dir, 'assets'), { recursive: true, force: true });

  const bytes = Buffer.byteLength(html);
  const gzip = gzipSync(html).length;
  const problems = check(html, bytes);
  report.push({ network, bytes, gzip, budget: BUDGET.htmlBytes, ok: problems.length === 0, problems });
  console.log(`${network.padEnd(8)} ${(bytes / 1024).toFixed(0).padStart(5)} KB  gzip ${(gzip / 1024).toFixed(0).padStart(4)} KB  ${problems.length ? `✗ ${problems.join('; ')}` : '✓'}`);
}

await writeFile(join(DIST, 'play', 'manifest.json'), JSON.stringify({ builtAt: new Date().toISOString(), budget: BUDGET, builds: report }, null, 2));
await mkdir(DIST, { recursive: true });
for (const name of await readdir(join(ROOT, 'showcase'))) await copyFile(join(ROOT, 'showcase', name), join(DIST, name));

if (report.some((r) => !r.ok)) {
  console.error('Сборка не прошла проверки требований рекламных сетей.');
  process.exit(1);
}

// Скрипт и стили — внутрь HTML. Скрипт уходит в конец body обычным <script>: DOM к этому моменту готов.
async function inline(dir) {
  let html = await readFile(join(dir, 'index.html'), 'utf8');
  const assets = await readdir(join(dir, 'assets'));
  const css = assets.filter((f) => f.endsWith('.css'));
  const js = assets.filter((f) => f.endsWith('.js'));
  if (js.length !== 1) throw new Error(`ожидался один JS-файл, получено ${js.length}: ${js.join(', ')}`);
  html = html.replace(/<link rel="stylesheet"[^>]*>\s*/g, '').replace(/<script type="module"[^>]*><\/script>\s*/g, '');
  const style = (await Promise.all(css.map((f) => readFile(join(dir, 'assets', f), 'utf8')))).join('\n');
  const script = (await readFile(join(dir, 'assets', js[0]), 'utf8')).replace(/<\/script/gi, '<\\/script');
  return html
    .replace('</head>', () => `<style>${style}</style>\n</head>`)
    .replace('</body>', () => `<script>${script}</script>\n</body>`);
}

// Требования, общие для сетей: один файл в бюджете и ни одного внешнего запроса из разметки.
function check(html, bytes) {
  const problems = [];
  if (bytes > BUDGET.htmlBytes) problems.push(`размер ${bytes} > бюджета ${BUDGET.htmlBytes}`);
  const external = html.match(/<(script|link|img|iframe|source)\b[^>]*\b(src|href)\s*=\s*["']?(https?:)?\/\//gi);
  if (external) problems.push(`внешние ресурсы: ${external.length}`);
  if (/<script[^>]+src=/i.test(html)) problems.push('остался внешний <script src>');
  if (/<link[^>]+stylesheet/i.test(html)) problems.push('остался внешний <link stylesheet>');
  return problems;
}
