import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

export function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const [rawKey, inlineValue] = token.slice(2).split('=', 2);
    const next = argv[index + 1];
    args[rawKey] = inlineValue ?? (next && !next.startsWith('--') ? argv[++index] : true);
  }
  return args;
}

export function formatLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createPrompter() {
  const rl = createInterface({ input, output });
  return {
    async ask(label, fallback = '') {
      const suffix = fallback ? ` (${fallback})` : '';
      const answer = (await rl.question(`${label}${suffix}: `)).trim();
      return answer || fallback;
    },
    close() { rl.close(); }
  };
}

export function slugify(value) {
  return String(value)
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 56);
}

export function quoteYaml(value) {
  return JSON.stringify(String(value));
}

export function parseBoolean(value, fallback = false) {
  if (value === undefined || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (['true', '1', 'yes', 'y'].includes(String(value).toLowerCase())) return true;
  if (['false', '0', 'no', 'n'].includes(String(value).toLowerCase())) return false;
  throw new Error(`Expected a boolean, received "${value}"`);
}
