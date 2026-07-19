import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFeed, isSafeUrl, parseNewsMarkdown, publicArticles, validateArticles } from '../scripts/lib/news.mjs';

const source = `---
id: 2026-07-20-example
title: "公開のお知らせ"
date: 2026-07-20
category: "お知らせ"
summary: "概要"
url: "/news/example"
externalUrl: ""
linkText: "詳細を見る"
published: true
featured: false
sites: [zakinu, mugnet]
---

本文です。`;

test('front matter is parsed and validated', () => {
  const article = parseNewsMarkdown(source, '2026-07-20-example.md');
  assert.equal(article.title, '公開のお知らせ');
  assert.deepEqual(article.sites, ['zakinu', 'mugnet']);
  assert.deepEqual(validateArticles([article], ['zakinu', 'mugnet']), []);
});

test('site feeds include matching published entries newest first', () => {
  const article = parseNewsMarkdown(source, '2026-07-20-example.md');
  const older = { ...article, id: '2026-01-01-older', filename: '2026-01-01-older.md', date: '2026-01-01' };
  assert.deepEqual(publicArticles([older, article], 'zakinu').map(item => item.id), [article.id, older.id]);
  assert.equal(buildFeed([article], 'mugnet').articles[0].linkUrl, '/news/example');
  assert.equal(buildFeed([article], 'all').articles.length, 1);
});

test('duplicate ids, invalid dates and unknown sites are rejected', () => {
  const article = parseNewsMarkdown(source, '2026-07-20-example.md');
  const errors = validateArticles([
    article,
    { ...article, filename: '2026-07-20-example.md', date: '2026-02-30', sites: ['unknown'] }
  ], ['zakinu', 'mugnet']);
  assert.match(errors.join('\n'), /duplicate id/);
  assert.match(errors.join('\n'), /invalid date/);
  assert.match(errors.join('\n'), /undefined site/);
});

test('drafts, unsafe URLs and raw HTML are rejected', () => {
  const article = parseNewsMarkdown(source, '2026-07-20-example.md');
  assert.equal(isSafeUrl('javascript:alert(1)'), false);
  const errors = validateArticles([{ ...article, published: false, body: '<img src=x>', url: 'javascript:alert(1)' }], ['zakinu', 'mugnet']);
  assert.match(errors.join('\n'), /drafts are not allowed/);
  assert.match(errors.join('\n'), /unsafe or invalid url/);
  assert.match(errors.join('\n'), /raw HTML/);
});
