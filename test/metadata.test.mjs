import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contentModifiedDate, loadNewsContent, publicArticles, serializeArticle } from '../scripts/lib/news.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const loaded = await loadNewsContent(root);
const articles = publicArticles(loaded.articles);

function articleJsonLd(html) {
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(match, 'article page must contain JSON-LD');
  return JSON.parse(match[1]);
}

test('content update date prefers reader-visible changes over legacy metadata', () => {
  assert.equal(contentModifiedDate({
    date: '2024-01-01',
    createdAt: '2024-01-02',
    updatedAt: '2024-01-03',
    metadataUpdatedAt: '2026-07-20',
    contentUpdatedAt: '2024-01-04'
  }), '2024-01-04');
  assert.equal(contentModifiedDate({ date: '2024-01-01', updatedAt: '2024-01-03' }), '2024-01-03');
});

test('serialized articles preserve new optional update fields', () => {
  const serialized = serializeArticle({
    id: '2026-07-21-example',
    date: '2026-07-21',
    title: 'Example',
    summary: 'Summary',
    body: 'Body',
    category: 'News',
    url: '',
    externalUrl: '',
    linkText: '',
    featured: false,
    sites: ['mugnet'],
    works: [],
    createdAt: '2026-07-21',
    updatedAt: '2026-07-21',
    contentUpdatedAt: '2026-07-21',
    metadataUpdatedAt: '2026-07-21'
  });
  assert.equal(serialized.contentUpdatedAt, '2026-07-21');
  assert.equal(serialized.metadataUpdatedAt, '2026-07-21');
});

test('latest feed is the first 20 entries of the full feed', async () => {
  const all = JSON.parse(await readFile(path.join(publicDir, 'data/news/all.json'), 'utf8'));
  const latest = JSON.parse(await readFile(path.join(publicDir, 'data/news/latest.json'), 'utf8'));
  assert.equal(latest.collection, 'latest');
  assert.equal(latest.limit, 20);
  assert.ok(latest.articles.length <= 20);
  assert.deepEqual(latest.articles, all.articles.slice(0, 20));
});

test('home page uses the approved MUGnet description', async () => {
  const html = await readFile(path.join(publicDir, 'index.html'), 'utf8');
  assert.match(html, /MUGnetはノベルゲーム制作サークルです。/);
  assert.match(html, /最新情報は<a href="https:\/\/mugnet\.jp\/">MUGnet公式サイト<\/a>でも公開しています。/);
  assert.doesNotMatch(html, /ゲームや音楽などの創作活動/);
  assert.match(html, /data\/news\/latest\.json/);
});

test('article JSON-LD and visible dates use contentModifiedAt semantics', async () => {
  for (const article of articles) {
    const html = await readFile(path.join(publicDir, 'news', article.id, 'index.html'), 'utf8');
    const jsonLd = articleJsonLd(html);
    const modified = contentModifiedDate(article);
    assert.equal(jsonLd.dateModified, modified, article.id);
    assert.ok(jsonLd.publisher?.name, `${article.id}: publisher is required`);
    assert.ok(jsonLd.author, `${article.id}: author is required`);
    assert.match(html, new RegExp(`datetime="${modified}"`));
    if (!article.contentUpdatedAt && article.metadataUpdatedAt && article.updatedAt) {
      assert.equal(jsonLd.dateModified, article.updatedAt);
    }
  }
});

test('sitemap article lastmod matches content update date', async () => {
  const sitemap = await readFile(path.join(publicDir, 'sitemap.xml'), 'utf8');
  for (const article of articles) {
    const url = `https://zakinu.github.io/MUGnet-News/news/${article.id}/`;
    const expected = `<url><loc>${url}</loc><lastmod>${contentModifiedDate(article)}</lastmod></url>`;
    assert.ok(sitemap.includes(expected), `${article.id}: sitemap lastmod mismatch`);
  }
});
