import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { isSafeUrl, isValidDate, validateLifecycleDates } from './news.mjs';

const ID_PATTERN = /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TYPES = new Set(['press-release', 'interview', 'media-coverage']);
const ALLOWED_FIELDS = new Set([
  'id', 'type', 'date', 'title', 'publication', 'summary', 'externalUrl',
  'works', 'includeInNews', 'published', 'createdAt', 'updatedAt'
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

export function parsePressMarkdown(source, filename = 'unknown.md') {
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

export function validatePressEntries(entries, allowedWorks, newsArticles) {
  const errors = [];
  const ids = new Map();
  const required = ['id', 'type', 'date', 'title', 'publication', 'summary', 'externalUrl', 'works', 'includeInNews', 'published'];
  for (const entry of entries) {
    const label = entry.filename || entry.id || 'unknown';
    for (const field of required) {
      if (entry[field] === undefined || entry[field] === null || entry[field] === '') errors.push(`${label}: required field "${field}" is missing`);
    }
    if (!ID_PATTERN.test(String(entry.id || ''))) errors.push(`${label}: invalid id`);
    if (entry.filename && path.basename(entry.filename, '.md') !== entry.id) errors.push(`${label}: filename must match id`);
    if (ids.has(entry.id)) errors.push(`${label}: duplicate id (also in ${ids.get(entry.id)})`); else ids.set(entry.id, label);
    if (!TYPES.has(entry.type)) errors.push(`${label}: invalid type "${entry.type}"`);
    if (!isValidDate(entry.date)) errors.push(`${label}: invalid date "${entry.date}"`);
    errors.push(...validateLifecycleDates(entry, label));
    if (!isSafeUrl(entry.externalUrl, { allowEmpty: false }) || !/^https?:/i.test(entry.externalUrl || '')) errors.push(`${label}: externalUrl must be a safe http or https URL`);
    if (!Array.isArray(entry.works)) errors.push(`${label}: works must be an array`);
    else {
      if (new Set(entry.works).size !== entry.works.length) errors.push(`${label}: works must not contain duplicates`);
      for (const work of entry.works) if (typeof work !== 'string' || !allowedWorks.includes(work)) errors.push(`${label}: undefined work "${work}"`);
    }
    if (typeof entry.includeInNews !== 'boolean') errors.push(`${label}: includeInNews must be true or false`);
    if (entry.includeInNews === true && newsArticles) {
      const matchingArticle = newsArticles.find(article => article.id === entry.id && article.published === true);
      if (!matchingArticle) errors.push(`${label}: includeInNews requires a published news article with the same id`);
    }
    if (entry.published !== true) errors.push(`${label}: drafts are not allowed in this public repository`);
    for (const field of ['title', 'publication', 'summary']) if (/<\/?[a-z][^>]*>/i.test(String(entry[field] || ''))) errors.push(`${label}: HTML is not allowed in ${field}`);
    if (/<\/?[a-z][^>]*>/i.test(entry.body || '')) errors.push(`${label}: raw HTML is not allowed in Markdown body`);
  }
  return errors;
}

export async function loadPressContent(rootDir, works, newsArticles) {
  const directory = path.join(rootDir, 'content/press');
  let files = [];
  try { files = (await readdir(directory)).filter(file => file.endsWith('.md')).sort(); } catch {}
  const entries = [];
  const parseErrors = [];
  for (const file of files) {
    try { entries.push(parsePressMarkdown(await readFile(path.join(directory, file), 'utf8'), file)); }
    catch (error) { parseErrors.push(error.message); }
  }
  const workIds = works.map(work => work.id);
  return { entries, errors: [...parseErrors, ...validatePressEntries(entries, workIds, newsArticles)] };
}

export function serializePressEntry(entry) {
  return {
    id: entry.id,
    type: entry.type,
    date: entry.date,
    title: entry.title,
    publication: entry.publication,
    summary: entry.summary,
    body: entry.body,
    linkUrl: entry.externalUrl,
    works: entry.works,
    includeInNews: entry.includeInNews,
    ...(entry.createdAt ? { createdAt: entry.createdAt } : {}),
    ...(entry.updatedAt ? { updatedAt: entry.updatedAt } : {})
  };
}

export function buildPressFeed(entries, work) {
  const filtered = entries
    .filter(entry => entry.published && (!work || entry.works.includes(work.id)))
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
    .map(serializePressEntry);
  return {
    schemaVersion: 1,
    ...(work ? { work: { id: work.id, name: work.name } } : { collection: 'press-and-interview' }),
    entries: filtered
  };
}
