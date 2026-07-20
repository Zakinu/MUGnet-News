import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadNewsContent } from '../scripts/lib/news.mjs';
import { normalizePublicBaseUrl } from '../scripts/lib/url.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const config = JSON.parse(await readFile(path.join(root, 'config/feed-channels.json'), 'utf8'));
const baseUrl = normalizePublicBaseUrl(config.publicBaseUrl);
const loaded = await loadNewsContent(root);
const published = loaded.articles.filter(article => article.published);
const publishedIds = new Set(published.map(article => article.id));

function htmlAttributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([:\w-]+)\s*=\s*["']([^"']*)["']/g)].map(match => [match[1].toLowerCase(), match[2]]));
}

function linkTags(html) {
  return [...html.matchAll(/<link\b[^>]*>/gi)].map(match => htmlAttributes(match[0]));
}

function jsonLdBlocks(html) {
  return [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map(match => JSON.parse(match[1]));
}

function publicPathForUrl(value) {
  const url = new URL(value);
  assert.equal(url.origin, baseUrl.origin, `sitemap URL must use the public origin: ${value}`);
  assert.ok(url.pathname.startsWith(baseUrl.pathname), `public base path is missing: ${value}`);
  const relative = decodeURIComponent(url.pathname.slice(baseUrl.pathname.length));
  return path.join(publicDir, relative, relative.endsWith('/') || relative === '' ? 'index.html' : '');
}

async function exists(file) {
  try { return (await stat(file)).isFile(); } catch { return false; }
}

test('every published article has one distinct static HTML page and no stale article directories remain', async () => {
  const newsDir = path.join(publicDir, 'news');
  const generatedIds = (await readdir(newsDir, { withFileTypes: true }))
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
  assert.deepEqual(generatedIds, [...publishedIds].sort());

  const pages = await Promise.all(generatedIds.map(id => readFile(path.join(newsDir, id, 'index.html'), 'utf8')));
  assert.equal(new Set(pages).size, pages.length, 'article HTML pages must not be identical boilerplate');
  for (const [index, id] of generatedIds.entries()) {
    assert.match(pages[index], new RegExp(`<title>[^<]+</title>`, 'i'), `${id} needs a title`);
    assert.match(pages[index], /<meta\b[^>]*name=["']description["'][^>]*>/i, `${id} needs a meta description`);
    assert.match(pages[index], /<h1\b[^>]*>/i, `${id} needs an h1`);
  }
});

test('article canonical URLs and JSON-LD are valid absolute URLs under the GitHub Pages base path', async () => {
  for (const article of published) {
    const html = await readFile(path.join(publicDir, 'news', article.id, 'index.html'), 'utf8');
    const canonicalLinks = linkTags(html).filter(link => (link.rel || '').split(/\s+/).includes('canonical'));
    assert.equal(canonicalLinks.length, 1, `${article.id} must have exactly one canonical link`);
    const expected = new URL(`news/${article.id}/`, baseUrl).href;
    assert.equal(canonicalLinks[0].href, expected);
    assert.match(canonicalLinks[0].href, /\/MUGnet-News\//);

    const blocks = jsonLdBlocks(html);
    assert.equal(blocks.length, 1, `${article.id} must have exactly one parseable JSON-LD block`);
    const data = blocks[0];
    assert.ok(['NewsArticle', 'Article'].includes(data['@type']));
    assert.equal(data.url, expected);
    const mainEntityUrl = typeof data.mainEntityOfPage === 'string'
      ? data.mainEntityOfPage
      : data.mainEntityOfPage?.['@id'];
    assert.equal(mainEntityUrl, expected);
    assert.equal(data.headline, article.title);
    assert.equal(data.description, article.summary);
    assert.equal(data.datePublished, article.date);
    assert.equal(typeof data.dateModified, 'string');
    assert.ok(data.publisher, `${article.id} needs a publisher`);
    for (const value of [data.url, mainEntityUrl]) {
      assert.doesNotThrow(() => new URL(value));
      assert.match(value, /^https:\/\//);
      assert.match(value, /\/MUGnet-News\//);
    }
    if (article.thumbnail) {
      assert.match(article.thumbnail, /^https:\/\//);
      assert.match(article.thumbnail, /\/MUGnet-News\//);
      assert.ok(html.includes(`<meta property="og:image" content="${article.thumbnail}">`));
      assert.ok(html.includes(`<meta name="twitter:image" content="${article.thumbnail}">`));
      assert.ok(html.includes(`<img src="${article.thumbnail}"`));
      assert.equal(await exists(publicPathForUrl(article.thumbnail)), true, `thumbnail does not exist: ${article.thumbnail}`);
    }
  }
});

test('article pages show configured site titles instead of raw site ids', async () => {
  for (const article of published) {
    const html = await readFile(path.join(publicDir, 'news', article.id, 'index.html'), 'utf8');
    for (const site of article.sites) {
      assert.match(html, new RegExp(`<li>${config.sites[site]?.title || site}</li>`));
    }
  }
});

test('sitemap contains every required public page and every URL resolves to generated output', async () => {
  const sitemap = await readFile(path.join(publicDir, 'sitemap.xml'), 'utf8');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.ok(urls.length > 0, 'sitemap must contain URLs');
  assert.equal(new Set(urls).size, urls.length, 'sitemap URLs must be unique');

  const required = [
    new URL('', baseUrl).href,
    new URL('news/', baseUrl).href,
    new URL('press/', baseUrl).href,
    ...loaded.works.map(work => new URL(`works/${work.id}/`, baseUrl).href),
    ...published.map(article => new URL(`news/${article.id}/`, baseUrl).href)
  ];
  for (const url of required) assert.ok(urls.includes(url), `sitemap is missing ${url}`);
  for (const url of urls) {
    assert.match(url, /\/MUGnet-News\//, `repository path is missing from ${url}`);
    assert.equal(await exists(publicPathForUrl(url)), true, `sitemap target does not exist: ${url}`);
  }
});

test('drafts are absent from article HTML, sitemap, and RSS', async () => {
  const allArticles = loaded.articles;
  const draftIds = allArticles.filter(article => !article.published).map(article => article.id);
  const sitemap = await readFile(path.join(publicDir, 'sitemap.xml'), 'utf8');
  const rss = await readFile(path.join(publicDir, 'feed.xml'), 'utf8');
  const generatedIds = (await readdir(path.join(publicDir, 'news'), { withFileTypes: true }))
    .filter(entry => entry.isDirectory()).map(entry => entry.name);

  for (const id of draftIds) {
    assert.equal(generatedIds.includes(id), false, `draft HTML was generated: ${id}`);
    assert.equal(sitemap.includes(`/news/${id}/`), false, `draft is in sitemap: ${id}`);
    assert.equal(rss.includes(`<guid isPermaLink="false">${id}</guid>`), false, `draft is in RSS: ${id}`);
  }
  const rssIds = [...rss.matchAll(/<guid\b[^>]*>([^<]+)<\/guid>/g)].map(match => match[1]);
  assert.deepEqual(new Set(rssIds), publishedIds, 'the all-news RSS must contain exactly the published articles');
});

test('generated HTML advertises the absolute RSS feed without noindex', async () => {
  const pages = [
    { file: path.join(publicDir, 'index.html'), feed: 'feed.xml' },
    { file: path.join(publicDir, 'news', 'index.html'), feed: 'feed.xml' },
    { file: path.join(publicDir, 'press', 'index.html'), feed: 'press.xml' },
    ...loaded.works.map(work => ({
      file: path.join(publicDir, 'works', work.id, 'index.html'),
      feed: `works/${work.id}.xml`
    })),
    ...published.map(article => ({
      file: path.join(publicDir, 'news', article.id, 'index.html'),
      feed: 'feed.xml'
    }))
  ];
  for (const { file, feed } of pages) {
    const html = await readFile(file, 'utf8');
    const alternates = linkTags(html).filter(link => link.rel === 'alternate' && link.type === 'application/rss+xml');
    const expectedFeed = new URL(feed, baseUrl).href;
    assert.ok(alternates.some(link => link.href === expectedFeed), `${path.relative(root, file)} needs RSS autodiscovery for ${expectedFeed}`);
    for (const alternate of alternates) {
      assert.match(alternate.href, /^https:\/\//);
      assert.match(alternate.href, /\/MUGnet-News\//);
    }
    assert.doesNotMatch(html, /<meta\b[^>]*\bnoindex\b[^>]*>/i);
    assert.match(html, /<html\b[^>]*lang=["']ja["']/i);
    assert.match(html, /<meta\b[^>]*charset=["']?utf-8/i);
  }
});

test('--check reports unexpected files left in generator-managed output directories', async t => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'mugnet-news-stale-check-'));
  t.after(() => rm(fixture, { recursive: true, force: true }));
  for (const directory of ['config', 'content', 'scripts', 'public']) {
    await cp(path.join(root, directory), path.join(fixture, directory), { recursive: true });
  }
  const staleRelative = path.join('public', 'data', 'news', 'works', 'removed-work.json');
  await mkdir(path.dirname(path.join(fixture, staleRelative)), { recursive: true });
  await writeFile(path.join(fixture, staleRelative), '{"stale":true}\n', 'utf8');

  const result = spawnSync(process.execPath, ['scripts/build-news.mjs', '--check'], {
    cwd: fixture,
    encoding: 'utf8'
  });
  assert.notEqual(result.status, 0, '--check must fail when an obsolete generated file remains');
  assert.match(`${result.stdout}\n${result.stderr}`, /removed-work\.json/);
});
