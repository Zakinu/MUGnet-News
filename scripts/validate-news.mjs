import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadNewsContent } from './lib/news.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { articles, sites, errors } = await loadNewsContent(root);

if (errors.length) {
  console.error(`News validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Validated ${articles.length} news article(s) for: ${sites.join(', ')}`);
}
