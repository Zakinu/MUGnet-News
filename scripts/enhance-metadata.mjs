import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contentModifiedDate, loadNewsContent, publicArticles } from './lib/news.mjs';
import { loadPressContent } from './lib/press.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const homeDescription = 'MUGnetと関連サイトの公式ニュース、作品情報、プレスリリースを、検索・参照しやすい形で公開するアーカイブです。';
const feedConfig = JSON.parse(await readFile(path.join(root, 'config/feed-channels.json'), 'utf8'));
const loaded = await loadNewsContent(root);
const press = await loadPressContent(root, loaded.works, loaded.articles);
const errors = [...loaded.errors, ...press.errors];
if (errors.length) {
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const articles = publicArticles(loaded.articles);
const pressEntries = press.entries
  .filter(entry => entry.published)
  .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));

await writeLatestFeed();
await updateHomePage();
await updateArticlePages();
await updateSitemap();
await updateLlmsTxt();

console.log(`Enhanced metadata for ${articles.length} news articles and generated latest.json.`);

async function writeLatestFeed() {
  const allPath = path.join(publicDir, 'data/news/all.json');
  const all = JSON.parse(await readFile(allPath, 'utf8'));
  const latest = {
    ...all,
    collection: 'latest',
    limit: 20,
    articles: all.articles.slice(0, 20)
  };
  await writeFile(path.join(publicDir, 'data/news/latest.json'), `${JSON.stringify(latest, null, 2)}\n`, 'utf8');
}

async function updateHomePage() {
  const file = path.join(publicDir, 'index.html');
  let html = await readFile(file, 'utf8');
  const oldIntro = /<p>MUGnetと関連サイトの公式ニュース、作品情報、プレスリリースを、検索・参照しやすい形で公開するアーカイブです。<\/p>\s*<p>MUGnetは、ゲームや音楽などの創作活動を行うクリエイティブサークルです。最新情報は<a href="https:\/\/mugnet\.jp\/">MUGnet公式サイト<\/a>でも公開しています。<\/p>/;
  const newIntro = '<p>MUGnetと関連サイトの公式ニュース、作品情報、プレスリリースを、検索・参照しやすい形で公開するアーカイブです。</p><p>MUGnetはノベルゲーム制作サークルです。</p><p>最新情報は<a href="https://mugnet.jp/">MUGnet公式サイト</a>でも公開しています。</p>';
  if (!oldIntro.test(html)) throw new Error('Unable to locate the current home-page introduction.');
  html = html.replace(oldIntro, newIntro);
  for (const pattern of [
    /<meta name="description" content="[^"]*">/,
    /<meta property="og:description" content="[^"]*">/,
    /<meta name="twitter:description" content="[^"]*">/
  ]) {
    const attribute = pattern.source.includes('property') ? 'property="og:description"' : pattern.source.includes('twitter') ? 'name="twitter:description"' : 'name="description"';
    html = html.replace(pattern, `<meta ${attribute} content="${homeDescription}">`);
  }
  const latestUrl = new URL('data/news/latest.json', feedConfig.publicBaseUrl).href;
  html = html.replace(
    /<li>全ニュース: <a href="([^"]*data\/news\/all\.json)">JSON<\/a> · <a href="([^"]*feed\.xml)">RSS<\/a><\/li>/,
    `<li>最新20件: <a href="${latestUrl}">JSON</a></li><li>全ニュース: <a href="$1">JSON</a> · <a href="$2">RSS</a></li>`
  );
  await writeFile(file, html, 'utf8');
}

async function updateArticlePages() {
  for (const article of articles) {
    const file = path.join(publicDir, 'news', article.id, 'index.html');
    let html = await readFile(file, 'utf8');
    const modified = contentModifiedDate(article);
    const entity = structuredEntity(article.sites[0]);
    const authors = article.sites.map(structuredEntity);

    html = html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/, (match, json) => {
      const data = JSON.parse(json);
      data.dateModified = modified;
      data.publisher = entity;
      data.author = authors.length === 1 ? authors[0] : authors;
      return `<script type="application/ld+json">${safeJson(data)}</script>`;
    });

    const dates = modified && modified !== article.date
      ? `<p class="dates"><span>公開日: <time datetime="${article.date}">${article.date}</time></span> <span>内容更新日: <time datetime="${modified}">${modified}</time></span></p>`
      : `<p class="dates"><span>公開日: <time datetime="${article.date}">${article.date}</time></span></p>`;
    html = html.replace(/<p class="dates">[\s\S]*?<\/p>/, dates);
    await writeFile(file, html, 'utf8');
  }
}

async function updateSitemap() {
  const file = path.join(publicDir, 'sitemap.xml');
  let xml = await readFile(file, 'utf8');
  const latestNewsDate = latestModified(articles);
  const latestPressDate = latestModified(pressEntries);
  const updates = new Map([
    ['', latestNewsDate],
    ['news/', latestNewsDate],
    ['press/', latestPressDate],
    ...loaded.works.map(work => {
      const workArticles = articles.filter(candidate => candidate.works.includes(work.id));
      return [`works/${work.id}/`, latestModified(workArticles)];
    }),
    ...articles.map(article => [`news/${article.id}/`, contentModifiedDate(article)])
  ]);

  for (const [relative, modified] of updates) {
    if (!modified) continue;
    const url = new URL(relative, feedConfig.publicBaseUrl).href;
    const escaped = escapeRegExp(url);
    xml = xml.replace(
      new RegExp(`<url><loc>${escaped}<\\/loc>(?:<lastmod>[^<]*<\\/lastmod>)?<\\/url>`),
      `<url><loc>${url}</loc><lastmod>${modified}</lastmod></url>`
    );
  }
  await writeFile(file, xml, 'utf8');
}

async function updateLlmsTxt() {
  const file = path.join(publicDir, 'llms.txt');
  let text = await readFile(file, 'utf8');
  if (!text.includes('Latest news JSON:')) {
    text = text.replace(
      /- All news JSON: ([^\n]+)\n/,
      '- Latest news JSON: ' + new URL('data/news/latest.json', feedConfig.publicBaseUrl).href + '\n- All news JSON: $1\n'
    );
  }
  await writeFile(file, text, 'utf8');
}

function latestModified(items) {
  return items.map(contentModifiedDate).filter(Boolean).sort().at(-1) || '';
}

function structuredEntity(site) {
  const configured = feedConfig.sites?.[site]?.entity;
  const fallback = feedConfig.sites?.mugnet?.entity || { type: 'Organization', name: 'MUGnet', url: 'https://mugnet.jp/' };
  const entity = configured || fallback;
  return { '@type': entity.type, name: entity.name, url: entity.url };
}

function safeJson(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
