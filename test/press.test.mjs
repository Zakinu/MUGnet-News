import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPressFeed, parsePressMarkdown, validatePressEntries } from '../scripts/lib/press.mjs';

const source = `---
id: 2026-07-17-example-press
type: press-release
date: 2026-07-17
title: "発表"
publication: "媒体"
summary: "概要"
externalUrl: "https://example.com/press"
works: [bonten]
includeInNews: false
published: true
---

本文です。`;

test('press front matter is parsed, validated and serialized', () => {
  const entry = parsePressMarkdown(source, '2026-07-17-example-press.md');
  assert.deepEqual(validatePressEntries([entry], ['bonten']), []);
  const feed = buildPressFeed([entry]);
  assert.equal(feed.collection, 'press-and-interview');
  assert.equal(feed.entries[0].linkUrl, 'https://example.com/press');
});

test('press entries reject invalid types and unknown works', () => {
  const entry = parsePressMarkdown(source, '2026-07-17-example-press.md');
  const errors = validatePressEntries([{ ...entry, type: 'event', works: ['unknown'] }], ['bonten']);
  assert.match(errors.join('\n'), /invalid type/);
  assert.match(errors.join('\n'), /undefined work/);
});

test('work-scoped press feeds contain only matching entries', () => {
  const entry = parsePressMarkdown(source, '2026-07-17-example-press.md');
  assert.equal(buildPressFeed([entry], { id: 'bonten', name: '梵天世界の壊し方' }).entries.length, 1);
  assert.equal(buildPressFeed([entry], { id: 'journey-to-die', name: 'Journey to die' }).entries.length, 0);
});

test('includeInNews requires a published news article with the same id', () => {
  const entry = { ...parsePressMarkdown(source, '2026-07-17-example-press.md'), includeInNews: true };
  const matchingNews = { id: entry.id, published: true };
  assert.deepEqual(validatePressEntries([entry], ['bonten'], [matchingNews]), []);

  const missingErrors = validatePressEntries([entry], ['bonten'], []);
  assert.match(missingErrors.join('\n'), /includeInNews.*published news article with the same id/i);

  const draftErrors = validatePressEntries([entry], ['bonten'], [{ ...matchingNews, published: false }]);
  assert.match(draftErrors.join('\n'), /includeInNews.*published news article with the same id/i);
});

test('press optional date metadata has strict types and chronology', () => {
  const entry = parsePressMarkdown(source, '2026-07-17-example-press.md');
  const invalidErrors = validatePressEntries([{
    ...entry,
    createdAt: 20260717,
    updatedAt: 'tomorrow'
  }], ['bonten']);
  assert.match(invalidErrors.join('\n'), /createdAt must be .*valid YYYY-MM-DD date/);
  assert.match(invalidErrors.join('\n'), /updatedAt must be .*valid YYYY-MM-DD date/);

  const chronologyErrors = validatePressEntries([{
    ...entry,
    createdAt: '2026-07-18',
    updatedAt: '2026-07-17'
  }], ['bonten']);
  assert.match(chronologyErrors.join('\n'), /updatedAt.*(before|earlier than).*createdAt/i);
});
