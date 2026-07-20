import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeSearchText, matchesNewsItem } from '../static/assets/news-search.js';
import { loadNewsContent } from '../scripts/lib/news.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const loaded = await loadNewsContent(root);
const published = loaded.articles.filter(article => article.published);

async function exists(file) {
  try { return (await stat(file)).isFile(); } catch { return false; }
}

test('search normalization handles full-width characters, case, and whitespace', () => {
  assert.equal(normalizeSearchText(' ＭＵＧｎｅｔ　 NEWS  '), 'mugnet news');
});

test('search matching combines keyword and taxonomy filters', () => {
  const record = {
    search: '梵天世界の壊し方 MUGnet イベント',
    year: '2026',
    category: 'イベント',
    sites: ['mugnet'],
    works: ['bonten']
  };
  assert.equal(matchesNewsItem(record, { query: '梵天', year: '2026', category: 'イベント', site: 'mugnet', work: 'bonten' }), true);
  assert.equal(matchesNewsItem(record, { query: 'journey', year: '', category: '', site: '', work: '' }), false);
  assert.equal(matchesNewsItem(record, { query: '', year: '', category: '', site: '', work: 'journey-to-die' }), false);
});

test('generated pages expose branding without hiding static article content', async () => {
  const newsHtml = await readFile(path.join(publicDir, 'news', 'index.html'), 'utf8');
  assert.match(newsHtml, /公式ニュースアーカイブ/);
  assert.match(newsHtml, /assets\/news-mark\.svg/);
  assert.match(newsHtml, /assets\/site\.css/);
  assert.match(newsHtml, /data-news-search hidden/);
  assert.match(newsHtml, /type="module"[^>]+assets\/news-search\.js/);
  for (const article of published) {
    assert.ok(newsHtml.includes(article.title), `news list must contain static text for ${article.id}`);
    assert.ok(newsHtml.includes(`data-year="${article.date.slice(0, 4)}"`));
  }
});

test('work pages receive the same progressive search interface', async () => {
  for (const work of loaded.works) {
    const html = await readFile(path.join(publicDir, 'works', work.id, 'index.html'), 'utf8');
    assert.match(html, /data-news-search hidden/);
    assert.match(html, /data-news-item/);
  }
});

test('brand and search assets are copied into generated output', async () => {
  for (const file of ['site.css', 'news-search.js', 'news-mark.svg']) {
    assert.equal(await exists(path.join(publicDir, 'assets', file)), true, `${file} must be copied to public/assets`);
  }
});
