import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPrompter, formatLocalDate, parseArgs, parseBoolean, quoteYaml, slugify } from './lib/cli.mjs';
import { isValidDate } from './lib/news.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = parseArgs(process.argv.slice(2));
const prompt = createPrompter();

try {
  if (args.published !== undefined && !parseBoolean(args.published, true)) {
    throw new Error('Drafts are not allowed in this public repository.');
  }
  const today = formatLocalDate();
  const title = String(args.title || await prompt.ask('タイトル'));
  const date = String(args.date || await prompt.ask('公開日 YYYY-MM-DD', today));
  if (!isValidDate(date)) throw new Error(`Invalid date: ${date}`);
  const { sites: allowedSites } = JSON.parse(await readFile(path.join(root, 'config/news-sites.json'), 'utf8'));
  const sites = String(args.sites || await prompt.ask(`掲載先（カンマ区切り: ${allowedSites.join(', ')})`, 'mugnet'))
    .split(',').map(value => value.trim()).filter(Boolean);
  const unknown = sites.filter(site => !allowedSites.includes(site));
  if (unknown.length) throw new Error(`Unknown site(s): ${unknown.join(', ')}`);

  const category = String(args.category || await prompt.ask('カテゴリ', 'お知らせ'));
  const summary = String(args.summary || await prompt.ask('一覧用の概要'));
  const externalUrl = String(Object.hasOwn(args, 'external-url')
    ? args['external-url']
    : await prompt.ask('外部リンク（なければ空欄）'));
  const url = externalUrl ? '' : String(Object.hasOwn(args, 'url')
    ? args.url
    : await prompt.ask('サイト内リンク（なければ空欄）'));
  const linkText = (externalUrl || url) ? String(args['link-text'] || await prompt.ask('リンク文言', '詳細を見る')) : '';
  const body = String(args.body || await prompt.ask('本文（1行。後からMarkdownで編集できます）', summary));
  const baseSlug = String(args.slug || slugify(title));
  if (!baseSlug) throw new Error('日本語タイトルの場合は --slug に半角英数字とハイフンのIDを指定してください。');
  const id = `${date}-${baseSlug}`;
  const target = path.join(root, 'content/news', `${id}.md`);
  const markdown = `---\nid: ${id}\ntitle: ${quoteYaml(title)}\ndate: ${date}\ncategory: ${quoteYaml(category)}\nsummary: ${quoteYaml(summary)}\nurl: ${quoteYaml(url)}\nexternalUrl: ${quoteYaml(externalUrl)}\nlinkText: ${quoteYaml(linkText)}\npublished: true\nfeatured: ${parseBoolean(args.featured, false)}\nsites: [${sites.join(', ')}]\ncreatedAt: ${today}\nupdatedAt: ${today}\n---\n\n${body}\n`;

  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, markdown, { encoding: 'utf8', flag: 'wx' });
  console.log(`Created ${path.relative(root, target)}`);
  console.log('Next: npm run build');
} finally {
  prompt.close();
}
