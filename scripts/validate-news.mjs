import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadNewsContent } from './lib/news.mjs';
import { loadPressContent } from './lib/press.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { articles, sites, works, errors: newsErrors } = await loadNewsContent(root);
const { entries, errors: pressErrors } = await loadPressContent(root, works);
const errors = [...newsErrors, ...pressErrors];

if (errors.length) {
  console.error(`Content validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Validated ${articles.length} news article(s) and ${entries.length} press entry(s) for sites ${sites.join(', ')} and works ${works.map(work => work.id).join(', ')}`);
}
