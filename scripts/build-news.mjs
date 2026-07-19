import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFeed, buildWorkFeed, loadNewsContent } from './lib/news.mjs';
import { buildRssFeed, rssGuids } from './lib/rss.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');
const { articles, sites, works, errors } = await loadNewsContent(root);
if (errors.length) {
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const outputs = new Map();
const feedConfig = JSON.parse(await readFile(path.join(root, 'config/feed-channels.json'), 'utf8'));
const publicBaseUrl = new URL(feedConfig.publicBaseUrl);
const feedPairs = [];

for (const site of [...sites, 'all']) {
  const json = buildFeed(articles, site);
  const jsonPath = path.join(root, 'public/data/news', `${site}.json`);
  const rssName = site === 'all' ? 'feed.xml' : `${site}.xml`;
  const rssPath = path.join(root, 'public', rssName);
  const channel = feedConfig.sites[site];
  if (!channel) {
    console.error(`Missing RSS channel configuration for site: ${site}`);
    process.exit(1);
  }
  const xml = buildRssFeed({
    ...channel,
    feedUrl: new URL(rssName, publicBaseUrl).href,
    articles: json.articles,
    siteChannels: feedConfig.sites
  });
  outputs.set(jsonPath, `${JSON.stringify(json, null, 2)}\n`);
  outputs.set(rssPath, xml);
  feedPairs.push({ label: site, json, xml });
}

for (const work of works) {
  const json = buildWorkFeed(articles, work);
  const jsonRelative = `data/news/works/${work.id}.json`;
  const rssRelative = `works/${work.id}.xml`;
  const channel = {
    title: `${work.name} News`,
    description: `${work.name}に関するMUGnetの最新情報`,
    link: feedConfig.sites.mugnet.link
  };
  const xml = buildRssFeed({
    ...channel,
    feedUrl: new URL(rssRelative, publicBaseUrl).href,
    articles: json.articles,
    siteChannels: feedConfig.sites
  });
  outputs.set(path.join(root, 'public', jsonRelative), `${JSON.stringify(json, null, 2)}\n`);
  outputs.set(path.join(root, 'public', rssRelative), xml);
  feedPairs.push({ label: `work:${work.id}`, json, xml });
}

for (const { label, json, xml } of feedPairs) {
  const jsonIds = json.articles.map(article => article.id);
  const xmlIds = rssGuids(xml);
  if (JSON.stringify(jsonIds) !== JSON.stringify(xmlIds)) {
    console.error(`JSON/RSS article mismatch: ${label}`);
    process.exit(1);
  }
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
  ? `Validated ${articles.length} articles; JSON and RSS feeds are current.`
  : `Generated ${outputs.size} JSON/RSS files from ${articles.length} articles.`);
