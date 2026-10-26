import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { MODULE_ID, MODULE_PATH } from '../module/scripts/art.mjs';

const MODULE_DIR = path.resolve(import.meta.dirname, '..', 'module');
const manifest = JSON.parse(readFileSync(path.join(MODULE_DIR, 'module.json'), 'utf8'));

test('compendium art mapping path is relative to the Data folder and points at the real file', () => {
  // Foundry fetches this path as-is, so a bare file name would request /art-mapping.json and register no art.
  const { mapping } = manifest.flags.compendiumArtMappings.pf2e;
  assert.ok(mapping.startsWith(`${MODULE_PATH}/`), `${mapping} must start with ${MODULE_PATH}/`);
  assert.ok(existsSync(path.join(MODULE_DIR, mapping.slice(MODULE_PATH.length + 1))));
});

test('manifest id and download URL match the module and its version', () => {
  assert.equal(manifest.id, MODULE_ID);
  assert.ok(manifest.download.includes(`/v${manifest.version}/`));
});
