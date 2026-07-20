import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schemaDirectory = path.join(root, 'schema');
const publicSchemaDirectory = path.join(root, 'public', 'schema');
const schemaNames = [
  'news-article.schema.json',
  'news-feed.schema.json',
  'press-entry.schema.json',
  'press-feed.schema.json'
];

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

async function collectJsonFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectJsonFiles(file));
    else if (entry.name.endsWith('.json')) files.push(file);
  }
  return files.sort();
}

function formatValidationErrors(validate) {
  return (validate.errors || [])
    .map(error => `${error.instancePath || '/'} ${error.message}`)
    .join('\n');
}

const schemas = Object.fromEntries(await Promise.all(schemaNames.map(async name => [
  name,
  await readJson(path.join(schemaDirectory, name))
])));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
for (const schema of Object.values(schemas)) ajv.addSchema(schema);

const validateNewsFeed = ajv.getSchema(schemas['news-feed.schema.json'].$id);
const validatePressFeed = ajv.getSchema(schemas['press-feed.schema.json'].$id);

assert.ok(validateNewsFeed, 'news feed schema must compile');
assert.ok(validatePressFeed, 'press feed schema must compile');

test('published schema copies match the repository schemas', async () => {
  for (const name of schemaNames) {
    const source = await readFile(path.join(schemaDirectory, name), 'utf8');
    const published = await readFile(path.join(publicSchemaDirectory, name), 'utf8');
    assert.equal(published, source, `${name} differs from its public copy`);
  }
});

test('all generated news JSON conforms to the public schema', async () => {
  const files = await collectJsonFiles(path.join(root, 'public', 'data', 'news'));
  assert.ok(files.length > 0, 'expected at least one generated news feed');
  for (const file of files) {
    const data = await readJson(file);
    assert.equal(
      validateNewsFeed(data),
      true,
      `${path.relative(root, file)} failed schema validation:\n${formatValidationErrors(validateNewsFeed)}`
    );
  }
});

test('all generated Press & Interview JSON conforms to the public schema', async () => {
  const files = await collectJsonFiles(path.join(root, 'public', 'data', 'press'));
  assert.ok(files.length > 0, 'expected at least one generated press feed');
  for (const file of files) {
    const data = await readJson(file);
    assert.equal(
      validatePressFeed(data),
      true,
      `${path.relative(root, file)} failed schema validation:\n${formatValidationErrors(validatePressFeed)}`
    );
  }
});

test('schemaVersion 1 accepts unknown additive fields but rejects incompatible versions', () => {
  const valid = {
    schemaVersion: 1,
    site: 'all',
    futureField: 'ignored by compatible clients',
    articles: []
  };
  assert.equal(validateNewsFeed(valid), true, formatValidationErrors(validateNewsFeed));
  assert.equal(validateNewsFeed({ ...valid, schemaVersion: 2 }), false);
});
