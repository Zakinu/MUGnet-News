import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFeed, buildWorkFeed, loadNewsContent } from './lib/news.mjs';
import { buildPressFeed, loadPressContent } from './lib/press.mjs';
import { buildRssFeed, rssGuids } from './lib/rss.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');
const { articles, sites, works, errors: newsErrors } = await loadNewsContent(root);
const { entries: pressEntries, errors: pressErrors } = await loadPressContent(root, works);
const errors = [...newsErrors, ...pressErrors];
if (errors.length) { for (const error of errors) console.error(`- ${error}`); process.exit(1); }

const outputs = new Map();
const feedConfig = JSON.parse(await readFile(path.join(root, 'config/feed-channels.json'), 'utf8'));
const publicBaseUrl = new URL(feedConfig.publicBaseUrl);
const feedPairs = [];

for (const site of [...sites, 'all']) {
  const json = buildFeed(articles, site);
  const rssName = site === 'all' ? 'feed.xml' : `${site}.xml`;
  const channel = feedConfig.sites[site];
  if (!channel) { console.error(`Missing RSS channel configuration for site: ${site}`); process.exit(1); }
  const xml = buildRssFeed({ ...channel, feedUrl: new URL(rssName, publicBaseUrl).href, articles: json.articles, siteChannels: feedConfig.sites });
  outputs.set(path.join(root, 'public/data/news', `${site}.json`), `${JSON.stringify(json, null, 2)}\n`);
  outputs.set(path.join(root, 'public', rssName), xml);
  feedPairs.push({ label: site, ids: json.articles.map(article => article.id), xml });
}

for (const work of works) {
  const json = buildWorkFeed(articles, work);
  const rssRelative = `works/${work.id}.xml`;
  const channel = { title: `${work.name} News`, description: `${work.name}に関するMUGnetの最新情報`, link: feedConfig.sites.mugnet.link };
  const xml = buildRssFeed({ ...channel, feedUrl: new URL(rssRelative, publicBaseUrl).href, articles: json.articles, siteChannels: feedConfig.sites });
  outputs.set(path.join(root, 'public/data/news/works', `${work.id}.json`), `${JSON.stringify(json, null, 2)}\n`);
  outputs.set(path.join(root, 'public', rssRelative), xml);
  feedPairs.push({ label: `work:${work.id}`, ids: json.articles.map(article => article.id), xml });
}

const pressChannel = feedConfig.press;
if (!pressChannel) { console.error('Missing RSS channel configuration for press'); process.exit(1); }
const allPress = buildPressFeed(pressEntries);
const pressRssEntries = allPress.entries.map(entry => ({ ...entry, externalUrl: entry.linkUrl, sites: ['mugnet'] }));
const pressXml = buildRssFeed({ ...pressChannel, feedUrl: new URL('press.xml', publicBaseUrl).href, articles: pressRssEntries, siteChannels: feedConfig.sites });
outputs.set(path.join(root, 'public/data/press/all.json'), `${JSON.stringify(allPress, null, 2)}\n`);
outputs.set(path.join(root, 'public/press.xml'), pressXml);
feedPairs.push({ label: 'press:all', ids: allPress.entries.map(entry => entry.id), xml: pressXml });

for (const work of works) {
  const json = buildPressFeed(pressEntries, work);
  const rssRelative = `press/works/${work.id}.xml`;
  const channel = { title: `${work.name} Press & Interview`, description: `${work.name}に関するプレスリリース、インタビュー、メディア掲載`, link: pressChannel.link };
  const pressRssEntries = json.entries.map(entry => ({ ...entry, externalUrl: entry.linkUrl, sites: ['mugnet'] }));
  const xml = buildRssFeed({ ...channel, feedUrl: new URL(rssRelative, publicBaseUrl).href, articles: pressRssEntries, siteChannels: feedConfig.sites });
  outputs.set(path.join(root, 'public/data/press/works', `${work.id}.json`), `${JSON.stringify(json, null, 2)}\n`);
  outputs.set(path.join(root, 'public', rssRelative), xml);
  feedPairs.push({ label: `press:work:${work.id}`, ids: json.entries.map(entry => entry.id), xml });
}

for (const { label, ids, xml } of feedPairs) {
  if (JSON.stringify(ids) !== JSON.stringify(rssGuids(xml))) { console.error(`JSON/RSS entry mismatch: ${label}`); process.exit(1); }
}

const stale = [];
for (const [file, expected] of outputs) {
  let current = '';
  try { current = await readFile(file, 'utf8'); } catch {}
  if (current !== expected) {
    stale.push(path.relative(root, file));
    if (!checkOnly) { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, expected, 'utf8'); }
  }
}
if (checkOnly && stale.length) { console.error(`Generated feeds are stale: ${stale.join(', ')}`); console.error('Run: npm run build'); process.exit(1); }
console.log(checkOnly ? `Validated ${articles.length} news articles and ${pressEntries.length} press entries; JSON and RSS feeds are current.` : `Generated ${outputs.size} JSON/RSS files from ${articles.length} news articles and ${pressEntries.length} press entries.`);
