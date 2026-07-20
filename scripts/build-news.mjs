import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFeed, buildWorkFeed, loadNewsContent, publicArticles } from './lib/news.mjs';
import { buildPressFeed, loadPressContent } from './lib/press.mjs';
import { buildRssFeed, rssGuids } from './lib/rss.mjs';
import { normalizePublicBaseUrl } from './lib/url.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const checkOnly = process.argv.includes('--check');
const { articles, sites, works, errors: newsErrors } = await loadNewsContent(root);
const { entries: pressEntries, errors: pressErrors } = await loadPressContent(root, works, articles);
const errors = [...newsErrors, ...pressErrors];
if (errors.length) { for (const error of errors) console.error(`- ${error}`); process.exit(1); }

const outputs = new Map();
const feedConfig = JSON.parse(await readFile(path.join(root, 'config/feed-channels.json'), 'utf8'));
const publicBaseUrl = normalizePublicBaseUrl(feedConfig.publicBaseUrl);
const feedPairs = [];

for (const site of [...sites, 'all']) {
  const json = buildFeed(articles, site);
  const rssName = site === 'all' ? 'feed.xml' : `${site}.xml`;
  const channel = feedConfig.sites[site];
  if (!channel) { console.error(`Missing RSS channel configuration for site: ${site}`); process.exit(1); }
  const xml = buildRssFeed({ ...channel, feedUrl: absoluteUrl(rssName), articles: json.articles, siteChannels: feedConfig.sites });
  addOutput(`data/news/${site}.json`, `${JSON.stringify(json, null, 2)}\n`);
  addOutput(rssName, xml);
  feedPairs.push({ label: site, ids: json.articles.map(article => article.id), xml });
}

for (const work of works) {
  const json = buildWorkFeed(articles, work);
  const rssRelative = `works/${work.id}.xml`;
  const channel = { title: `${work.name} News`, description: `${work.name}に関するMUGnetの最新情報`, link: feedConfig.sites.mugnet.link };
  const xml = buildRssFeed({ ...channel, feedUrl: absoluteUrl(rssRelative), articles: json.articles, siteChannels: feedConfig.sites });
  addOutput(`data/news/works/${work.id}.json`, `${JSON.stringify(json, null, 2)}\n`);
  addOutput(rssRelative, xml);
  feedPairs.push({ label: `work:${work.id}`, ids: json.articles.map(article => article.id), xml });
}

const pressChannel = feedConfig.press;
if (!pressChannel) { console.error('Missing RSS channel configuration for press'); process.exit(1); }
const allPress = buildPressFeed(pressEntries);
const pressRssEntries = allPress.entries.map(entry => ({ ...entry, externalUrl: entry.linkUrl, sites: ['mugnet'] }));
const pressXml = buildRssFeed({ ...pressChannel, feedUrl: absoluteUrl('press.xml'), articles: pressRssEntries, siteChannels: feedConfig.sites });
addOutput('data/press/all.json', `${JSON.stringify(allPress, null, 2)}\n`);
addOutput('press.xml', pressXml);
feedPairs.push({ label: 'press:all', ids: allPress.entries.map(entry => entry.id), xml: pressXml });

for (const work of works) {
  const json = buildPressFeed(pressEntries, work);
  const rssRelative = `press/works/${work.id}.xml`;
  const channel = { title: `${work.name} Press & Interview`, description: `${work.name}に関するプレスリリース、インタビュー、メディア掲載`, link: pressChannel.link };
  const rssEntries = json.entries.map(entry => ({ ...entry, externalUrl: entry.linkUrl, sites: ['mugnet'] }));
  const xml = buildRssFeed({ ...channel, feedUrl: absoluteUrl(rssRelative), articles: rssEntries, siteChannels: feedConfig.sites });
  addOutput(`data/press/works/${work.id}.json`, `${JSON.stringify(json, null, 2)}\n`);
  addOutput(rssRelative, xml);
  feedPairs.push({ label: `press:work:${work.id}`, ids: json.entries.map(entry => entry.id), xml });
}

for (const { label, ids, xml } of feedPairs) {
  if (JSON.stringify(ids) !== JSON.stringify(rssGuids(xml))) { console.error(`JSON/RSS entry mismatch: ${label}`); process.exit(1); }
}

const publishedArticles = publicArticles(articles);
const publishedPress = pressEntries
  .filter(entry => entry.published)
  .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));

addOutput('index.html', renderHomePage(publishedArticles, publishedPress));
addOutput('news/index.html', renderArticleListPage({
  title: 'ニュース一覧',
  description: 'MUGnetと関連サイトの公式ニュース一覧です。',
  relativeUrl: 'news/',
  articles: publishedArticles
}));

for (const article of publishedArticles) addOutput(`news/${article.id}/index.html`, renderArticlePage(article));

for (const work of works) {
  addOutput(`works/${work.id}/index.html`, renderArticleListPage({
    title: `${work.name} ニュース`,
    description: `${work.name}に関するMUGnetの公式ニュース一覧です。`,
    relativeUrl: `works/${work.id}/`,
    articles: publishedArticles.filter(article => article.works.includes(work.id)),
    rssRelative: `works/${work.id}.xml`,
    jsonRelative: `data/news/works/${work.id}.json`
  }));
}

addOutput('press/index.html', renderPressPage(publishedPress));
addOutput('sitemap.xml', renderSitemap(publishedArticles, works));
addOutput('robots.txt', [
  'User-agent: *', 'Allow: /', '',
  'User-agent: OAI-SearchBot', 'Allow: /', '',
  'User-agent: GPTBot', 'Allow: /', '',
  `Sitemap: ${absoluteUrl('sitemap.xml')}`, ''
].join('\n'));
addOutput('llms.txt', renderLlmsTxt(works, sites));

const unexpected = await findUnexpectedGeneratedFiles(new Set(outputs.keys()));
const stale = [];
for (const [file, expected] of outputs) {
  let current = '';
  try { current = await readFile(file, 'utf8'); } catch {}
  if (current !== expected) {
    stale.push(path.relative(root, file));
    if (!checkOnly) { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, expected, 'utf8'); }
  }
}
if (!checkOnly) {
  for (const file of unexpected) await rm(file);
  await removeEmptyGeneratedDirectories();
}
if (checkOnly && (stale.length || unexpected.length)) {
  if (stale.length) console.error(`Generated files are stale: ${stale.join(', ')}`);
  if (unexpected.length) console.error(`Unexpected generated files: ${unexpected.map(file => path.relative(root, file)).join(', ')}`);
  console.error('Run: npm run build');
  process.exit(1);
}
console.log(checkOnly
  ? `Validated ${articles.length} news articles and ${pressEntries.length} press entries; ${outputs.size} generated files are current.`
  : `Generated ${outputs.size} files from ${articles.length} news articles and ${pressEntries.length} press entries${unexpected.length ? `; removed ${unexpected.length} obsolete files` : ''}.`);

function absoluteUrl(relative = '') {
  return new URL(String(relative).replace(/^\/+/, ''), publicBaseUrl).href;
}

function addOutput(relative, value) {
  outputs.set(path.join(publicDir, ...relative.split('/')), value);
}

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function markdownInline(value) {
  const source = String(value ?? '');
  let output = '';
  let cursor = 0;
  for (const match of source.matchAll(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g)) {
    output += escapeHtml(source.slice(cursor, match.index));
    output += `<a href="${escapeHtml(match[2])}" rel="noopener noreferrer">${escapeHtml(match[1])}</a>`;
    cursor = match.index + match[0].length;
  }
  return output + escapeHtml(source.slice(cursor));
}

function markdownToHtml(markdown) {
  return String(markdown ?? '').trim().split(/\n\s*\n/).filter(Boolean)
    .map(block => `<p>${block.split('\n').map(markdownInline).join('<br>')}</p>`).join('\n');
}

function pageShell({ title, description, relativeUrl, body, jsonLd = null, rssRelative = 'feed.xml', imageUrl = '' }) {
  const canonical = absoluteUrl(relativeUrl);
  const fullTitle = title === 'MUGnet News' ? title : `${title} | MUGnet News`;
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <link rel="alternate" type="application/rss+xml" title="MUGnet News" href="${escapeHtml(absoluteUrl('feed.xml'))}">${rssRelative !== 'feed.xml' ? `
  <link rel="alternate" type="application/rss+xml" title="${escapeHtml(title)}" href="${escapeHtml(absoluteUrl(rssRelative))}">` : ''}
  <meta property="og:type" content="${jsonLd ? 'article' : 'website'}">
  <meta property="og:site_name" content="MUGnet News">
  <meta property="og:title" content="${escapeHtml(fullTitle)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">${imageUrl ? `
  <meta property="og:image" content="${escapeHtml(imageUrl)}">` : ''}
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(fullTitle)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">${imageUrl ? `
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">` : ''}${jsonLd ? `
  <script type="application/ld+json">${safeJson(jsonLd)}</script>` : ''}
  <style>${siteCss()}</style>
</head>
<body>
  <header><a class="brand" href="${escapeHtml(absoluteUrl())}">MUGnet News</a><nav aria-label="主要ナビゲーション"><a href="${escapeHtml(absoluteUrl('news/'))}">News</a><a href="${escapeHtml(absoluteUrl('press/'))}">Press &amp; Interview</a></nav></header>
  <main>${body}</main>
  <footer><p><a href="https://mugnet.jp/">MUGnet公式サイト</a> · <a href="${escapeHtml(absoluteUrl('feed.xml'))}">RSS</a> · <a href="${escapeHtml(absoluteUrl('data/news/all.json'))}">JSON</a></p></footer>
</body>
</html>
`;
}

function safeJson(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026');
}

function articleList(articles) {
  if (!articles.length) return '<p>公開されている記事はありません。</p>';
  return `<ol class="article-list">${articles.map(article => `<li><article><time datetime="${escapeHtml(article.date)}">${escapeHtml(article.date)}</time><h2><a href="${escapeHtml(absoluteUrl(`news/${article.id}/`))}">${escapeHtml(article.title)}</a></h2><p>${escapeHtml(article.summary)}</p></article></li>`).join('')}</ol>`;
}

function renderHomePage(news, press) {
  const workLinks = works.map(work => `<li><a href="${escapeHtml(absoluteUrl(`works/${work.id}/`))}">${escapeHtml(work.name)}</a></li>`).join('');
  const siteFeeds = sites.map(site => `<li>${escapeHtml(site)}: <a href="${escapeHtml(absoluteUrl(`data/news/${site}.json`))}">JSON</a> · <a href="${escapeHtml(absoluteUrl(`${site}.xml`))}">RSS</a></li>`).join('');
  const workFeeds = works.map(work => `<li>${escapeHtml(work.name)}: <a href="${escapeHtml(absoluteUrl(`data/news/works/${work.id}.json`))}">JSON</a> · <a href="${escapeHtml(absoluteUrl(`works/${work.id}.xml`))}">RSS</a></li>`).join('');
  return pageShell({
    title: 'MUGnet News',
    description: 'MUGnetと関連サイトの公式ニュース、作品情報、プレスリリースを集約した公開アーカイブです。',
    relativeUrl: '',
    body: `<section><h1>MUGnet News</h1><p>MUGnetと関連サイトの公式ニュース、作品情報、プレスリリースを、検索・参照しやすい形で公開するアーカイブです。</p><p>MUGnetは、ゲームや音楽などの創作活動を行うクリエイティブサークルです。最新情報は<a href="https://mugnet.jp/">MUGnet公式サイト</a>でも公開しています。</p></section>
<section><h2>最新ニュース</h2>${articleList(news.slice(0, 10))}<p><a href="${escapeHtml(absoluteUrl('news/'))}">ニュースをすべて見る</a></p></section>
<section><h2>一覧</h2><ul><li><a href="${escapeHtml(absoluteUrl('news/'))}">News</a></li><li><a href="${escapeHtml(absoluteUrl('press/'))}">Press &amp; Interview（${press.length}件）</a></li>${workLinks}</ul></section>
<section><h2>データフィード</h2><ul><li>全ニュース: <a href="${escapeHtml(absoluteUrl('data/news/all.json'))}">JSON</a> · <a href="${escapeHtml(absoluteUrl('feed.xml'))}">RSS</a></li>${siteFeeds}${workFeeds}<li>Press &amp; Interview: <a href="${escapeHtml(absoluteUrl('data/press/all.json'))}">JSON</a> · <a href="${escapeHtml(absoluteUrl('press.xml'))}">RSS</a></li></ul></section>`
  });
}

function renderArticleListPage({ title, description, relativeUrl, articles: list, rssRelative = 'feed.xml', jsonRelative = 'data/news/all.json' }) {
  return pageShell({ title, description, relativeUrl, rssRelative, body: `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p>${articleList(list)}<p class="feeds"><a href="${escapeHtml(absoluteUrl(jsonRelative))}">JSON</a> · <a href="${escapeHtml(absoluteUrl(rssRelative))}">RSS</a></p>` });
}

function renderArticlePage(article) {
  const relativeUrl = `news/${article.id}/`;
  const canonical = absoluteUrl(relativeUrl);
  const modified = article.updatedAt || article.createdAt || article.date;
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'NewsArticle',
    headline: article.title, description: article.summary,
    datePublished: article.date, dateModified: modified,
    publisher: { '@type': 'Organization', name: 'MUGnet', url: 'https://mugnet.jp/' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical }, url: canonical
  };
  const siteItems = article.sites
    .map(site => `<li>${escapeHtml(feedConfig.sites[site]?.title || site)}</li>`)
    .join('');
  const workItems = article.works.map(id => {
    const work = works.find(candidate => candidate.id === id);
    return `<li><a href="${escapeHtml(absoluteUrl(`works/${id}/`))}">${escapeHtml(work?.name || id)}</a></li>`;
  }).join('');
  const linkUrl = article.externalUrl || article.url;
  return pageShell({
    title: article.title, description: article.summary, relativeUrl, jsonLd, imageUrl: article.thumbnail,
    body: `<article><h1>${escapeHtml(article.title)}</h1><p class="dates"><span>公開日: <time datetime="${escapeHtml(article.date)}">${escapeHtml(article.date)}</time></span> <span>更新日: <time datetime="${escapeHtml(modified)}">${escapeHtml(modified)}</time></span></p>${article.thumbnail ? `<figure style="margin:1.5rem 0;max-width:48rem"><img src="${escapeHtml(article.thumbnail)}" alt="${escapeHtml(article.title)}" loading="lazy" decoding="async" style="display:block;width:100%;height:auto;border-radius:.4rem"></figure>` : ''}<p class="summary">${escapeHtml(article.summary)}</p><div class="article-body">${markdownToHtml(article.body)}</div>${linkUrl ? `<p><a class="external" href="${escapeHtml(new URL(linkUrl, feedConfig.sites[article.sites[0]]?.link || publicBaseUrl).href)}" rel="noopener noreferrer">${escapeHtml(article.linkText || '公式情報を見る')}</a></p>` : ''}<dl><dt>Sites</dt><dd><ul>${siteItems}</ul></dd><dt>Works</dt><dd>${workItems ? `<ul>${workItems}</ul>` : '—'}</dd></dl></article>`
  });
}

function renderPressPage(entries) {
  const list = entries.length ? `<ol class="article-list">${entries.map(entry => `<li><article><time datetime="${escapeHtml(entry.date)}">${escapeHtml(entry.date)}</time><h2><a href="${escapeHtml(entry.externalUrl)}" rel="noopener noreferrer">${escapeHtml(entry.title)}</a></h2><p>${escapeHtml(entry.summary)}</p><p class="publication">${escapeHtml(entry.publication)}</p></article></li>`).join('')}</ol>` : '<p>公開されている記事はありません。</p>';
  return pageShell({ title: 'Press & Interview', description: 'MUGnetに関するプレスリリース、インタビュー、メディア掲載の一覧です。', relativeUrl: 'press/', rssRelative: 'press.xml', body: `<h1>Press &amp; Interview</h1><p>MUGnetに関するプレスリリース、インタビュー、メディア掲載をまとめています。</p>${list}<p class="feeds"><a href="${escapeHtml(absoluteUrl('data/press/all.json'))}">JSON</a> · <a href="${escapeHtml(absoluteUrl('press.xml'))}">RSS</a></p>` });
}

function renderSitemap(news, configuredWorks) {
  const pages = [
    { relative: '', modified: news[0]?.updatedAt || news[0]?.date },
    { relative: 'news/', modified: news[0]?.updatedAt || news[0]?.date },
    { relative: 'press/', modified: publishedPress[0]?.updatedAt || publishedPress[0]?.date },
    ...configuredWorks.map(work => ({ relative: `works/${work.id}/`, modified: news.find(article => article.works.includes(work.id))?.updatedAt || news.find(article => article.works.includes(work.id))?.date })),
    ...news.map(article => ({ relative: `news/${article.id}/`, modified: article.updatedAt || article.createdAt || article.date }))
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(page => `  <url><loc>${escapeHtml(absoluteUrl(page.relative))}</loc>${page.modified ? `<lastmod>${escapeHtml(page.modified)}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`;
}

function renderLlmsTxt(configuredWorks, configuredSites) {
  return `# MUGnet News\n\nMUGnet Newsは、MUGnetと関連サイトが公開したニュース、作品情報、プレスリリースを収録する公式公開アーカイブです。記載内容はすべて公開情報です。\n\n## Main resources\n\n- Top page: ${absoluteUrl()}\n- All news JSON: ${absoluteUrl('data/news/all.json')}\n- News RSS: ${absoluteUrl('feed.xml')}\n- Press & Interview: ${absoluteUrl('press/')}\n- Press JSON: ${absoluteUrl('data/press/all.json')}\n- Press RSS: ${absoluteUrl('press.xml')}\n${configuredSites.map(site => `- ${site} JSON: ${absoluteUrl(`data/news/${site}.json`)}`).join('\n')}\n${configuredWorks.map(work => `- ${work.name} JSON: ${absoluteUrl(`data/news/works/${work.id}.json`)}`).join('\n')}\n- MUGnet official website: https://mugnet.jp/\n`;
}

async function findUnexpectedGeneratedFiles(expected) {
  const candidates = [];
  await collectMatching(path.join(publicDir, 'data/news'), file => file.endsWith('.json'), candidates);
  await collectMatching(path.join(publicDir, 'data/press'), file => file.endsWith('.json'), candidates);
  await collectMatching(path.join(publicDir, 'news'), file => path.basename(file) === 'index.html', candidates);
  await collectMatching(path.join(publicDir, 'works'), file => file.endsWith('.xml') || path.basename(file) === 'index.html', candidates);
  await collectMatching(path.join(publicDir, 'press/works'), file => file.endsWith('.xml'), candidates);
  try {
    for (const name of await readdir(publicDir)) if (name.endsWith('.xml') && name !== 'sitemap.xml') candidates.push(path.join(publicDir, name));
  } catch {}
  return [...new Set(candidates)].filter(file => !expected.has(file));
}

async function collectMatching(directory, predicate, result) {
  let entries = [];
  try { entries = await readdir(directory, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await collectMatching(file, predicate, result);
    else if (predicate(file)) result.push(file);
  }
}

async function removeEmptyGeneratedDirectories() {
  for (const directory of [path.join(publicDir, 'news'), path.join(publicDir, 'press/works'), path.join(publicDir, 'works'), path.join(publicDir, 'data/news/works'), path.join(publicDir, 'data/press/works')]) await removeEmptyChildren(directory);
}

async function removeEmptyChildren(directory) {
  let entries = [];
  try { entries = await readdir(directory, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) if (entry.isDirectory()) await removeEmptyChildren(path.join(directory, entry.name));
  try { if ((await readdir(directory)).length === 0) await rm(directory, { recursive: false }); } catch {}
}

function siteCss() {
  return `:root{color-scheme:light;--ink:#17212b;--muted:#5f6b76;--line:#d8dee4;--accent:#1957a6}*{box-sizing:border-box}body{margin:0;color:var(--ink);font:16px/1.75 system-ui,-apple-system,"Segoe UI",sans-serif;background:#fff}header,main,footer{width:min(72rem,calc(100% - 2rem));margin:auto}header{display:flex;align-items:center;justify-content:space-between;padding:1rem 0;border-bottom:1px solid var(--line)}nav{display:flex;gap:1rem}.brand{font-size:1.15rem;font-weight:700;text-decoration:none}main{padding:2.5rem 0}footer{padding:1.5rem 0;border-top:1px solid var(--line);color:var(--muted)}a{color:var(--accent);text-underline-offset:.15em}h1,h2{line-height:1.35}h1{font-size:clamp(1.8rem,5vw,2.8rem)}section+section{margin-top:3rem}.article-list{padding:0;list-style:none}.article-list li{padding:1.25rem 0;border-bottom:1px solid var(--line)}.article-list h2{margin:.2rem 0;font-size:1.25rem}.article-list p{margin:.35rem 0}.article-list time,.dates,.publication{color:var(--muted);font-size:.9rem}.summary{font-size:1.1rem;font-weight:600}.article-body{margin:2rem 0;max-width:48rem}.external{display:inline-block;padding:.6rem .9rem;border:1px solid var(--accent);border-radius:.3rem}dl{margin-top:2rem;border-top:1px solid var(--line);padding-top:1rem}dt{font-weight:700}dd{margin:0 0 1rem}dd ul{margin:.25rem 0;padding-left:1.5rem}@media(max-width:38rem){header{align-items:flex-start;gap:.75rem;flex-direction:column}nav{flex-wrap:wrap}main{padding:1.5rem 0}}`;
}
