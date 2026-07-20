import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadNewsContent, publicArticles } from './lib/news.mjs';
import { normalizePublicBaseUrl } from './lib/url.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const feedConfig = JSON.parse(await readFile(path.join(root, 'config/feed-channels.json'), 'utf8'));
const publicBaseUrl = normalizePublicBaseUrl(feedConfig.publicBaseUrl);
const loaded = await loadNewsContent(root);
if (loaded.errors.length) {
  for (const error of loaded.errors) console.error(`- ${error}`);
  process.exit(1);
}

const published = publicArticles(loaded.articles);
const workById = new Map(loaded.works.map(work => [work.id, work]));
const siteTitle = site => feedConfig.sites[site]?.title || site;

const listPages = new Map([
  [path.join(publicDir, 'index.html'), { articles: published.slice(0, 10), searchable: false, home: true }],
  [path.join(publicDir, 'news', 'index.html'), { articles: published, searchable: true, home: false }],
  ...loaded.works.map(work => [
    path.join(publicDir, 'works', work.id, 'index.html'),
    { articles: published.filter(article => article.works.includes(work.id)), searchable: true, home: false }
  ])
]);

const htmlFiles = await collectHtmlFiles(publicDir);
for (const file of htmlFiles) {
  let html = await readFile(file, 'utf8');
  html = addBrandAssets(html);
  html = replaceHeader(html);

  const listPage = listPages.get(file);
  if (listPage) {
    html = replaceArticleList(html, listPage.articles, listPage.searchable);
    if (listPage.searchable) html = addSearchScript(html);
    if (listPage.home) html = enhanceHome(html);
  }

  await writeFile(file, html, 'utf8');
}

console.log(`Enhanced ${htmlFiles.length} HTML pages with MUGnet News branding and progressive search.`);

async function collectHtmlFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectHtmlFiles(file));
    else if (entry.name.endsWith('.html')) files.push(file);
  }
  return files;
}

function absoluteUrl(relative = '') {
  return new URL(String(relative).replace(/^\/+/, ''), publicBaseUrl).href;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('\n', ' ');
}

function addBrandAssets(html) {
  if (html.includes('assets/site.css')) return html;
  const assets = [
    `  <link rel="icon" type="image/svg+xml" href="${escapeAttribute(absoluteUrl('assets/news-mark.svg'))}">`,
    '  <meta name="theme-color" content="#111111">',
    `  <link rel="stylesheet" href="${escapeAttribute(absoluteUrl('assets/site.css'))}">`
  ].join('\n');
  return html.replace('</head>', `${assets}\n</head>`);
}

function replaceHeader(html) {
  const header = `<header class="site-header">
  <div class="header-inner">
    <a class="brand" href="${escapeAttribute(absoluteUrl())}" aria-label="MUGnet News トップ">
      <span class="brand-symbol" aria-hidden="true"><span></span><span></span></span>
      <span class="brand-copy"><strong>MUGnet</strong><small>News Archive</small></span>
    </a>
    <span class="official-badge">公式ニュースアーカイブ</span>
    <nav aria-label="主要ナビゲーション">
      <a href="${escapeAttribute(absoluteUrl('news/'))}">News</a>
      <a href="${escapeAttribute(absoluteUrl('press/'))}">Press &amp; Interview</a>
      <a href="${escapeAttribute(absoluteUrl('#works'))}">Works</a>
      <a href="https://mugnet.jp/" rel="noopener noreferrer">MUGnet.jp</a>
    </nav>
  </div>
</header>`;
  return html.replace(/<header>[\s\S]*?<\/header>/, header);
}

function replaceArticleList(html, articles, searchable) {
  if (!html.includes('<ol class="article-list">')) return html;
  const controls = searchable ? renderSearchControls(articles) : '';
  const list = renderArticleCards(articles, searchable);
  return html.replace(/<ol class="article-list">[\s\S]*?<\/ol>/, `${controls}${list}`);
}

function renderSearchControls(articles) {
  const years = uniqueSorted(articles.map(article => article.date.slice(0, 4)), (a, b) => b.localeCompare(a));
  const categories = uniqueSorted(articles.map(article => article.category), (a, b) => a.localeCompare(b, 'ja'));
  const sites = uniqueSorted(articles.flatMap(article => article.sites), (a, b) => siteTitle(a).localeCompare(siteTitle(b), 'ja'));
  const works = uniqueSorted(articles.flatMap(article => article.works), (a, b) => (workById.get(a)?.name || a).localeCompare(workById.get(b)?.name || b, 'ja'));

  return `<section class="search-panel" data-news-search-root>
  <form class="news-search" data-news-search hidden>
    <div class="search-field search-query"><label for="news-search-query">キーワード</label><input id="news-search-query" name="q" type="search" autocomplete="off" placeholder="タイトル・概要・作品名から検索"></div>
    ${renderSelect('year', '年', years.map(value => [value, value]))}
    ${renderSelect('category', 'カテゴリ', categories.map(value => [value, value]))}
    ${renderSelect('site', '掲載元', sites.map(value => [value, siteTitle(value)]))}
    ${renderSelect('work', '作品', works.map(value => [value, workById.get(value)?.name || value]))}
    <button type="reset" class="search-reset">条件をクリア</button>
  </form>
  <p class="result-count" data-result-count aria-live="polite">${articles.length}件</p>
  <p class="no-results" data-no-results hidden>条件に一致するニュースはありません。</p>
</section>`;
}

function renderSelect(name, label, options) {
  if (!options.length) return '';
  return `<div class="search-field"><label for="news-search-${name}">${escapeHtml(label)}</label><select id="news-search-${name}" name="${escapeAttribute(name)}"><option value="">すべて</option>${options.map(([value, text]) => `<option value="${escapeAttribute(value)}">${escapeHtml(text)}</option>`).join('')}</select></div>`;
}

function renderArticleCards(articles, searchable) {
  if (!articles.length) return '<p>公開されている記事はありません。</p>';
  return `<ol class="article-list article-grid" id="news-results">${articles.map(article => {
    const works = article.works.map(id => workById.get(id)?.name || id);
    const sites = article.sites.map(siteTitle);
    const searchableText = [article.title, article.summary, article.category, ...sites, ...works].join(' ');
    const data = searchable
      ? ` data-news-item data-search="${escapeAttribute(searchableText)}" data-year="${escapeAttribute(article.date.slice(0, 4))}" data-category="${escapeAttribute(article.category)}" data-sites="${escapeAttribute(article.sites.join('|'))}" data-works="${escapeAttribute(article.works.join('|'))}"`
      : '';
    return `<li${data}><article class="news-card">${article.thumbnail ? `<a class="card-image" href="${escapeAttribute(absoluteUrl(`news/${article.id}/`))}" tabindex="-1" aria-hidden="true"><img src="${escapeAttribute(article.thumbnail)}" alt="" loading="lazy" decoding="async"></a>` : ''}<div class="card-content"><div class="card-meta"><time datetime="${escapeAttribute(article.date)}">${escapeHtml(article.date)}</time><span class="category-badge">${escapeHtml(article.category)}</span></div><h2><a href="${escapeAttribute(absoluteUrl(`news/${article.id}/`))}">${escapeHtml(article.title)}</a></h2><p>${escapeHtml(article.summary)}</p><ul class="card-taxonomy" aria-label="記事情報">${sites.map(site => `<li>${escapeHtml(site)}</li>`).join('')}${works.map(work => `<li>${escapeHtml(work)}</li>`).join('')}</ul></div></article></li>`;
  }).join('')}</ol>`;
}

function addSearchScript(html) {
  if (html.includes('assets/news-search.js')) return html;
  return html.replace('</body>', `  <script type="module" src="${escapeAttribute(absoluteUrl('assets/news-search.js'))}"></script>\n</body>`);
}

function enhanceHome(html) {
  return html
    .replace('<section><h1>MUGnet News</h1>', '<section class="hero"><p class="eyebrow">MUGnet Official Archive</p><h1>MUGnet News</h1>')
    .replace('<section><h2>一覧</h2>', '<section id="works"><h2>作品・掲載情報</h2>')
    .replace(/<section><h2>データフィード<\/h2>/, '<section class="developer-area"><p class="eyebrow">For Developers</p><h2>データフィード</h2>');
}

function uniqueSorted(values, compare) {
  return [...new Set(values.filter(Boolean))].sort(compare);
}
