import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFeed, buildWorkFeed, isSafeUrl, parseNewsMarkdown, publicArticles, validateArticles } from '../scripts/lib/news.mjs';
import { formatLocalDate, parseArgs } from '../scripts/lib/cli.mjs';
import { buildRssFeed, normalizeArticleUrl, rssGuids } from '../scripts/lib/rss.mjs';
import { isSafeUrl as isSafeClientUrl } from '../examples/news-feed-client.js';

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
works: [journey-to-die]
---

本文です。`;

test('front matter is parsed and validated', () => {
  const article = parseNewsMarkdown(source, '2026-07-20-example.md');
  assert.equal(article.title, '公開のお知らせ');
  assert.deepEqual(article.sites, ['zakinu', 'mugnet']);
  assert.deepEqual(article.works, ['journey-to-die']);
  assert.deepEqual(validateArticles([article], ['zakinu', 'mugnet'], ['journey-to-die']), []);
});

test('site feeds include matching published entries newest first', () => {
  const article = parseNewsMarkdown(source, '2026-07-20-example.md');
  const older = { ...article, id: '2026-01-01-older', filename: '2026-01-01-older.md', date: '2026-01-01' };
  assert.deepEqual(publicArticles([older, article], 'zakinu').map(item => item.id), [article.id, older.id]);
  assert.equal(buildFeed([article], 'mugnet').articles[0].linkUrl, '/news/example');
  assert.equal(buildFeed([article], 'all').articles.length, 1);
  assert.equal(buildWorkFeed([article], { id: 'journey-to-die', name: 'Journey to die' }).articles.length, 1);
});

test('duplicate ids, invalid dates and unknown sites are rejected', () => {
  const article = parseNewsMarkdown(source, '2026-07-20-example.md');
  const errors = validateArticles([
    article,
    { ...article, filename: '2026-07-20-example.md', date: '2026-02-30', sites: ['unknown'] }
  ], ['zakinu', 'mugnet'], ['journey-to-die']);
  assert.match(errors.join('\n'), /duplicate id/);
  assert.match(errors.join('\n'), /invalid date/);
  assert.match(errors.join('\n'), /undefined site/);
});

test('drafts, unsafe URLs and raw HTML are rejected', () => {
  const article = parseNewsMarkdown(source, '2026-07-20-example.md');
  assert.equal(isSafeUrl('javascript:alert(1)'), false);
  const errors = validateArticles([{ ...article, published: false, body: '<img src=x>', url: 'javascript:alert(1)' }], ['zakinu', 'mugnet'], ['journey-to-die']);
  assert.match(errors.join('\n'), /drafts are not allowed/);
  assert.match(errors.join('\n'), /unsafe or invalid url/);
  assert.match(errors.join('\n'), /raw HTML/);
});

test('missing, duplicate and unknown work ids are rejected', () => {
  const article = parseNewsMarkdown(source, '2026-07-20-example.md');
  const missingErrors = validateArticles([{ ...article, works: undefined }], ['zakinu', 'mugnet'], ['journey-to-die']);
  const duplicateErrors = validateArticles([{ ...article, works: ['journey-to-die', 'journey-to-die'] }], ['zakinu', 'mugnet'], ['journey-to-die']);
  const unknownErrors = validateArticles([{ ...article, works: ['unknown'] }], ['zakinu', 'mugnet'], ['journey-to-die']);
  assert.match(missingErrors.join('\n'), /required field "works" is missing/);
  assert.match(missingErrors.join('\n'), /works must be an array/);
  assert.match(duplicateErrors.join('\n'), /works must not contain duplicates/);
  assert.match(unknownErrors.join('\n'), /undefined work/);
});

test('RSS escapes XML, normalizes URLs and matches JSON article ids', () => {
  const article = parseNewsMarkdown(source, '2026-07-20-example.md');
  const serialized = buildFeed([article], 'all').articles;
  const channels = { zakinu: { link: 'https://zakinu.jp/' } };
  const xml = buildRssFeed({
    title: 'MUGnet & News',
    description: '<Latest>',
    link: 'https://mugnet.jp/',
    feedUrl: 'https://zakinu.github.io/MUGnet-News/feed.xml',
    articles: serialized,
    siteChannels: channels
  });
  assert.match(xml, /MUGnet &amp; News/);
  assert.match(xml, /&lt;Latest&gt;/);
  assert.equal(normalizeArticleUrl(article, channels, 'https://mugnet.jp/'), 'https://zakinu.jp/news/example');
  assert.deepEqual(rssGuids(xml), serialized.map(item => item.id));
});

test('CLI preserves empty optional URL flags', () => {
  const args = parseArgs(['--url', '/news/example', '--external-url=']);
  assert.equal(args.url, '/news/example');
  assert.equal(args['external-url'], '');
  assert.equal(Object.hasOwn(args, 'external-url'), true);
});

test('local dates do not use the UTC calendar day', () => {
  const nearMidnight = new Date(2026, 6, 20, 0, 30);
  assert.equal(formatLocalDate(nearMidnight), '2026-07-20');
});

test('client URL validation matches hash links accepted by feeds', () => {
  assert.equal(isSafeClientUrl('#section'), true);
  assert.equal(isSafeClientUrl('#invalid section'), false);
});

test('site initializers ignore pages without a news container', async () => {
  let callbacks = 0;
  globalThis.document = {
    addEventListener(event, callback) {
      assert.equal(event, 'DOMContentLoaded');
      callbacks += 1;
      callback();
    },
    querySelector() { return null; }
  };
  try {
    await import('../examples/mugnet.js?test=no-container');
    await import('../examples/music.js?test=no-container');
    await import('../examples/zakinu.js?test=no-container');
  } finally {
    delete globalThis.document;
  }
  assert.equal(callbacks, 3);
});
