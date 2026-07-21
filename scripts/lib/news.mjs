import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const ID_PATTERN = /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LIFECYCLE_DATE_FIELDS = ['createdAt', 'updatedAt', 'contentUpdatedAt', 'metadataUpdatedAt'];
const ALLOWED_FIELDS = new Set([
  'id', 'title', 'date', 'category', 'summary', 'url', 'externalUrl',
  'linkText', 'published', 'featured', 'sites', 'works', 'thumbnail',
  ...LIFECYCLE_DATE_FIELDS
]);

function parseScalar(raw) {
  const value = raw.trim();
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null' || value === '') return '';
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim();
    return inner ? inner.split(',').map(item => parseScalar(item)) : [];
  }
  if (value.startsWith('"') && value.endsWith('"')) {
    try { return JSON.parse(value); } catch { return value.slice(1, -1); }
  }
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1);
  return value;
}

export function parseNewsMarkdown(source, filename = 'unknown.md') {
  const normalized = source.replace(/^\uFEFF/, '').replaceAll('\r\n', '\n');
  if (!normalized.startsWith('---\n')) throw new Error(`${filename}: front matter must start with ---`);
  const end = normalized.indexOf('\n---\n', 4);
  if (end < 0) throw new Error(`${filename}: front matter is not closed`);

  const metadata = Object.create(null);
  for (const [index, line] of normalized.slice(4, end).split('\n').entries()) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const separator = line.indexOf(':');
    if (separator <= 0) throw new Error(`${filename}:${index + 2}: invalid front matter line`);
    const key = line.slice(0, separator).trim();
    if (!ALLOWED_FIELDS.has(key)) throw new Error(`${filename}: unknown field "${key}"`);
    if (Object.hasOwn(metadata, key)) throw new Error(`${filename}: duplicate field "${key}"`);
    metadata[key] = parseScalar(line.slice(separator + 1));
  }
  return { ...metadata, body: normalized.slice(end + 5).trim(), filename };
}

export function isValidDate(value) {
  if (!DATE_PATTERN.test(String(value))) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function contentModifiedDate(item) {
  return item.contentUpdatedAt || item.updatedAt || item.createdAt || item.date;
}

export function validateLifecycleDates(item, label) {
  const errors = [];
  for (const field of LIFECYCLE_DATE_FIELDS) {
    if (item[field] !== undefined && (typeof item[field] !== 'string' || !isValidDate(item[field]))) {
      errors.push(`${label}: ${field} must be a valid YYYY-MM-DD date`);
    }
  }
  for (const field of ['updatedAt', 'contentUpdatedAt', 'metadataUpdatedAt']) {
    if (
      typeof item.createdAt === 'string' && isValidDate(item.createdAt)
      && typeof item[field] === 'string' && isValidDate(item[field])
      && item[field] < item.createdAt
    ) {
      errors.push(`${label}: ${field} must not be earlier than createdAt`);
    }
  }
  return errors;
}

export function isSafeUrl(value, { allowEmpty = true } = {}) {
  if (!value) return allowEmpty;
  if (typeof value !== 'string' || /[\u0000-\u001f\\]/.test(value)) return false;
  if (value.startsWith('#')) return /^#[A-Za-z][A-Za-z0-9_-]*$/.test(value) || value === '#';
  if (value.startsWith('/')) {
    if (value.startsWith('//')) return false;
    try { return !decodeURIComponent(value).split('/').includes('..'); } catch { return false; }
  }
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}

export function validateArticles(articles, allowedSites, allowedWorks, { publicRepository = true } = {}) {
  const errors = [];
  const ids = new Map();
  const required = ['id', 'title', 'date', 'summary', 'category', 'published', 'featured', 'sites', 'works'];

  for (const article of articles) {
    const label = article.filename || article.id || 'unknown';
    for (const field of required) {
      if (article[field] === undefined || article[field] === null || article[field] === '') {
        errors.push(`${label}: required field "${field}" is missing`);
      }
    }
    for (const field of ['id', 'title', 'date', 'summary', 'category']) {
      if (article[field] !== undefined && typeof article[field] !== 'string') {
        errors.push(`${label}: ${field} must be a string`);
      }
    }
    if (article.linkText !== undefined && typeof article.linkText !== 'string') {
      errors.push(`${label}: linkText must be a string`);
    }
    errors.push(...validateLifecycleDates(article, label));
    if (!ID_PATTERN.test(String(article.id || ''))) errors.push(`${label}: invalid id`);
    if (article.filename && path.basename(article.filename, '.md') !== article.id) errors.push(`${label}: filename must match id`);
    if (ids.has(article.id)) errors.push(`${label}: duplicate id (also in ${ids.get(article.id)})`);
    else ids.set(article.id, label);
    if (!isValidDate(article.date)) errors.push(`${label}: invalid date "${article.date}"`);
    if (!Array.isArray(article.sites) || article.sites.length === 0) {
      errors.push(`${label}: sites must contain at least one site`);
    } else {
      if (new Set(article.sites).size !== article.sites.length) errors.push(`${label}: sites must not contain duplicates`);
      for (const site of article.sites) {
        if (typeof site !== 'string' || !allowedSites.includes(site)) errors.push(`${label}: undefined site "${site}"`);
      }
    }
    if (!Array.isArray(article.works)) {
      errors.push(`${label}: works must be an array`);
    } else {
      if (new Set(article.works).size !== article.works.length) errors.push(`${label}: works must not contain duplicates`);
      for (const work of article.works) {
        if (typeof work !== 'string' || !allowedWorks.includes(work)) errors.push(`${label}: undefined work "${work}"`);
      }
    }
    if (typeof article.published !== 'boolean') errors.push(`${label}: published must be true or false`);
    if (publicRepository && article.published !== true) errors.push(`${label}: drafts are not allowed in this public repository`);
    if (typeof article.featured !== 'boolean') errors.push(`${label}: featured must be true or false`);
    for (const field of ['url', 'externalUrl', 'thumbnail']) {
      if (!isSafeUrl(article[field])) errors.push(`${label}: unsafe or invalid ${field}`);
    }
    if (article.url && /^https?:/i.test(article.url)) errors.push(`${label}: use externalUrl for external links`);
    if (article.externalUrl && !/^https?:/i.test(article.externalUrl)) errors.push(`${label}: externalUrl must use http or https`);
    if (article.url && article.externalUrl) errors.push(`${label}: use either url or externalUrl, not both`);
    for (const field of ['title', 'summary', 'category', 'linkText']) {
      if (/<\/?[a-z][^>]*>/i.test(String(article[field] || ''))) errors.push(`${label}: HTML is not allowed in ${field}`);
    }
    if (/<\/?[a-z][^>]*>/i.test(article.body || '')) errors.push(`${label}: raw HTML is not allowed in Markdown body`);
    if (article.published && !article.body?.trim() && !article.url && !article.externalUrl) {
      errors.push(`${label}: a published article needs body text or a link`);
    }
  }
  return errors;
}

export async function loadNewsContent(rootDir) {
  const siteConfig = JSON.parse(await readFile(path.join(rootDir, 'config/news-sites.json'), 'utf8'));
  const workConfig = JSON.parse(await readFile(path.join(rootDir, 'config/news-works.json'), 'utf8'));
  const workIds = workConfig.works.map(work => work.id);
  const configErrors = [];
  if (new Set(workIds).size !== workIds.length) configErrors.push('config/news-works.json: work ids must be unique');
  for (const work of workConfig.works) {
    if (!work || typeof work.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(work.id)) {
      configErrors.push('config/news-works.json: each work needs a valid fixed id');
    }
    if (!work || typeof work.name !== 'string' || !work.name.trim()) {
      configErrors.push(`config/news-works.json: work "${work?.id || 'unknown'}" needs a display name`);
    }
  }
  const files = (await readdir(path.join(rootDir, 'content/news'))).filter(file => file.endsWith('.md')).sort();
  const articles = [];
  const parseErrors = [];
  for (const file of files) {
    try {
      articles.push(parseNewsMarkdown(await readFile(path.join(rootDir, 'content/news', file), 'utf8'), file));
    } catch (error) {
      parseErrors.push(error.message);
    }
  }
  return {
    articles,
    sites: siteConfig.sites,
    works: workConfig.works,
    errors: [...configErrors, ...parseErrors, ...validateArticles(articles, siteConfig.sites, workIds)]
  };
}

export function publicArticles(articles, site) {
  return articles
    .filter(article => article.published && (!site || article.sites.includes(site)))
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}

export function serializeArticle(article) {
  const linkUrl = article.externalUrl || article.url || '';
  return {
    id: article.id,
    date: article.date,
    title: article.title,
    summary: article.summary,
    body: article.body,
    category: article.category,
    linkUrl,
    linkText: article.linkText || (linkUrl ? '詳細を見る' : ''),
    external: Boolean(article.externalUrl),
    featured: article.featured,
    sites: article.sites,
    works: article.works,
    ...(article.thumbnail ? { thumbnail: article.thumbnail } : {}),
    ...(article.createdAt ? { createdAt: article.createdAt } : {}),
    ...(article.updatedAt ? { updatedAt: article.updatedAt } : {}),
    ...(article.contentUpdatedAt ? { contentUpdatedAt: article.contentUpdatedAt } : {}),
    ...(article.metadataUpdatedAt ? { metadataUpdatedAt: article.metadataUpdatedAt } : {})
  };
}

export function buildFeed(articles, site) {
  return {
    schemaVersion: 1,
    site,
    articles: publicArticles(articles, site === 'all' ? undefined : site).map(serializeArticle)
  };
}

export function buildWorkFeed(articles, work) {
  for (const article of articles) {
    if (!Array.isArray(article.works)) {
      const label = article.filename || article.id || 'unknown';
      throw new Error(`${label}: cannot build work feed: "works" must be an array`);
    }
  }

  return {
    schemaVersion: 1,
    work: {
      id: work.id,
      name: work.name
    },
    articles: articles
      .filter(article => article.published && article.works.includes(work.id))
      .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
      .map(serializeArticle)
  };
}
