import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const staticDir = path.join(root, 'static');
const publicDir = path.join(root, 'public');
const schemaDir = path.join(root, 'schema');

async function collectFiles(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(absolute, relative));
    else files.push(relative);
  }
  return files.sort();
}

async function isFile(file) {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

test('generated public output is not tracked by Git', () => {
  const result = spawnSync('git', ['ls-files', '--', 'public'], {
    cwd: root,
    encoding: 'utf8'
  });
  if (result.error) {
    assert.fail(`Failed to execute git: ${result.error.message}`);
  }
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), '', 'public/ must contain generated, untracked output only');
});

test('all static source files are copied into generated public output', async () => {
  const files = await collectFiles(staticDir);
  assert.ok(files.length > 0, 'static/ must contain at least one maintained file');
  for (const relative of files) {
    const source = path.join(staticDir, relative);
    const generated = path.join(publicDir, relative);
    assert.equal(await isFile(generated), true, `generated static file is missing: ${relative}`);
    assert.deepEqual(await readFile(generated), await readFile(source), `generated static file differs: ${relative}`);
  }
});

test('all repository schemas are copied into generated public output', async () => {
  const files = (await collectFiles(schemaDir)).filter(file => file.endsWith('.json'));
  assert.ok(files.length > 0, 'schema/ must contain JSON Schema files');
  for (const relative of files) {
    const source = path.join(schemaDir, relative);
    const generated = path.join(publicDir, 'schema', relative);
    assert.equal(await isFile(generated), true, `generated schema is missing: ${relative}`);
    assert.deepEqual(await readFile(generated), await readFile(source), `generated schema differs: ${relative}`);
  }
});
