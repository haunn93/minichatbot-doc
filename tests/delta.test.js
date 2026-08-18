import { test } from 'node:test';
import assert from 'node:assert';
import { diffManifests } from '../main.js';

test('diffManifests classifies added/updated/deleted/skipped', () => {
  const oldM = { '1': { hash: 'a' }, '2': { hash: 'b' }, '3': { hash: 'c' } };
  const newM = {
    '1': { hash: 'a' },
    '2': { hash: 'B' },
    '4': { hash: 'd' },
  };
  const { added, updated, deleted, skipped } = diffManifests(oldM, newM);
  assert.deepStrictEqual(added, ['4']);
  assert.deepStrictEqual(updated, ['2']);
  assert.deepStrictEqual(deleted, ['3']);
  assert.deepStrictEqual(skipped, ['1']);
});
