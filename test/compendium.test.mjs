// Runs module/scripts/compendium.mjs against stand-in Foundry settings.
import assert from 'node:assert/strict';
import { test } from 'node:test';

const MODULE_ID = 'sargas-pf2-creature-images';
const store = new Map([['core.compendiumArtConfiguration', { 'other-art': { portraits: true, tokens: false } }]]);
let registered = 0;

globalThis.foundry = { utils: { deepClone: (v) => structuredClone(v) }, helpers: {} };
globalThis.game = {
  user: { isGM: true },
  settings: {
    get: (ns, key) => store.get(`${ns}.${key}`),
    set: async (ns, key, value) => store.set(`${ns}.${key}`, value),
  },
  compendiumArt: { _registerArt: async () => registered++ },
};
store.set(`${MODULE_ID}.compendiumArtInitialized`, false);

const { initializeCompendiumArt, isCompendiumArtOn, setCompendiumArt } =
  await import('../module/scripts/compendium.mjs');

test('a fresh install starts with compendium art off, once', async () => {
  assert.equal(isCompendiumArtOn(), true, 'Foundry enables art from every module by default');
  await initializeCompendiumArt();
  assert.equal(isCompendiumArtOn(), false);
  assert.equal(store.get(`${MODULE_ID}.compendiumArtInitialized`), true);

  await setCompendiumArt(true);
  await initializeCompendiumArt();
  assert.equal(isCompendiumArtOn(), true, 'later loads do not switch it off again');
});

test('the button toggles only this module and keeps other modules and priority', async () => {
  store.set('core.compendiumArtConfiguration', {
    'other-art': { portraits: true, tokens: false },
    [MODULE_ID]: { portraits: true, tokens: true, priority: 3 },
  });
  const before = registered;
  await setCompendiumArt(false);
  assert.deepEqual(store.get('core.compendiumArtConfiguration'), {
    'other-art': { portraits: true, tokens: false },
    [MODULE_ID]: { portraits: false, tokens: false, priority: 3 },
  });
  assert.equal(isCompendiumArtOn(), false);
  assert.equal(registered, before + 1, 'mappings are re-registered right away');
});
