import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFeed, loadNewsContent } from './lib/news.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');
const { articles, sites, errors } = await loadNewsContent(root);
if (errors.length) {
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const outputs = new Map();
for (const site of [...sites, 'all']) {
  outputs.set(path.join(root, 'public/data/news', `${site}.json`), `${JSON.stringify(buildFeed(articles, site), null, 2)}\n`);
}

const stale = [];
for (const [file, expected] of outputs) {
  let current = '';
  try { current = await readFile(file, 'utf8'); } catch {}
  if (current !== expected) {
    stale.push(path.relative(root, file));
    if (!checkOnly) {
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, expected, 'utf8');
    }
  }
}
if (checkOnly && stale.length) {
  console.error(`Generated feeds are stale: ${stale.join(', ')}`);
  console.error('Run: npm run build');
  process.exit(1);
}
console.log(checkOnly
  ? `Validated ${articles.length} articles; generated feeds are current.`
  : `Generated ${outputs.size} feeds from ${articles.length} articles.`);
