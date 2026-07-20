import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const staticDir = path.join(root, 'static');
const schemaDir = path.join(root, 'schema');

await rm(publicDir, { recursive: true, force: true });
await mkdir(publicDir, { recursive: true });

try {
  await cp(staticDir, publicDir, { recursive: true, force: true });
} catch (error) {
  if (error?.code === 'ENOENT') {
    console.error('Static source directory is missing: static/');
    process.exit(1);
  }
  throw error;
}

try {
  await cp(schemaDir, path.join(publicDir, 'schema'), { recursive: true, force: true });
} catch (error) {
  if (error?.code === 'ENOENT') {
    console.error('Schema source directory is missing: schema/');
    process.exit(1);
  }
  throw error;
}

console.log('Prepared clean public/ output from static/ and schema/.');
