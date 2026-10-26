import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MODULE_ID, isDefaultImage, planApply, planRevert, tokenFor } from '../module/scripts/art.mjs';

const PORTRAIT = 'modules/sargas-pf2-creature-images/assets/creatures/portraits/kobold-scout-rm.webp';
const TOKEN = 'modules/sargas-pf2-creature-images/assets/creatures/tokens/kobold-scout-rm.webp';
const NPC_ICON = 'systems/pf2e/icons/default-icons/npc.svg';
const entryFor = (token, portrait = PORTRAIT) => ({ actor: portrait, token: tokenFor({ actor: portrait, token }) });
const DELETE = { [`flags.-=${MODULE_ID}`]: null };

const actor = ({ img = NPC_ICON, token = NPC_ICON, ring = false, flags = {} } = {}) => ({
  img,
  prototypeToken: { texture: { src: token }, ring: { enabled: ring, subject: { texture: null } } },
  flags,
});

/** Applies a flat update to plain actor data, the way Foundry would. */
function applyUpdate(data, update) {
  const out = structuredClone(data);
  for (const [key, value] of Object.entries(update)) {
    if (key.startsWith('flags.-=')) {
      delete out.flags[key.slice('flags.-='.length)];
      continue;
    }
    const parts = key.split('.');
    let target = out;
    for (const part of parts.slice(0, -1)) target = target[part] ??= {};
    target[parts.at(-1)] = value;
  }
  return out;
}

test('default images are PF2e default icons and the Foundry placeholder', () => {
  assert.ok(isDefaultImage(NPC_ICON));
  assert.ok(isDefaultImage('icons/svg/mystery-man.svg'));
  assert.ok(isDefaultImage(null));
  assert.ok(!isDefaultImage('worlds/mine/goblin.webp'));
});

test('official token art is used as-is; otherwise the portrait goes in the dynamic ring', () => {
  assert.deepEqual(tokenFor({ actor: PORTRAIT, token: TOKEN }), { texture: { src: TOKEN }, ring: { enabled: false } });
  assert.deepEqual(tokenFor({ actor: PORTRAIT, token: null }), {
    texture: { src: PORTRAIT },
    ring: { enabled: true, subject: { texture: PORTRAIT } },
  });
});

test('apply replaces default portrait and token, and backs up the originals', () => {
  const update = planApply(actor(), entryFor(TOKEN));
  assert.equal(update.img, PORTRAIT);
  assert.equal(update['prototypeToken.texture.src'], TOKEN);
  assert.equal(update['prototypeToken.ring.enabled'], false);
  assert.deepEqual(update[`flags.${MODULE_ID}.original`], {
    img: NPC_ICON,
    token: { src: NPC_ICON, ringEnabled: false, ringSubject: null },
  });
});

test('custom art is kept; portrait and token are judged separately', () => {
  assert.equal(planApply(actor({ img: 'mine.webp', token: 'mine.webp' }), entryFor(TOKEN)), null);
  const update = planApply(actor({ img: 'mine.webp' }), entryFor(TOKEN));
  assert.equal(update.img, undefined);
  assert.equal(update['prototypeToken.texture.src'], TOKEN);
});

test('apply is idempotent and apply then revert restores the exact original', () => {
  const original = actor({ ring: false });
  const entry = entryFor(null);
  const applied = applyUpdate(original, planApply(original, entry));
  assert.equal(applied.prototypeToken.ring.enabled, true);
  assert.equal(planApply(applied, entry), null);

  const reverted = applyUpdate(applied, planRevert(applied, DELETE));
  assert.deepEqual(reverted, original);
});

test('revert keeps images the user changed after applying, and ignores untouched actors', () => {
  const original = actor();
  const applied = applyUpdate(original, planApply(original, entryFor(TOKEN)));
  const edited = { ...applied, img: 'my-own.webp' };
  const update = planRevert(edited, DELETE);
  assert.equal(update.img, undefined);
  assert.equal(update['prototypeToken.texture.src'], NPC_ICON);
  assert.equal(planRevert(original, DELETE), null);
});

test('a second apply keeps the first backup', () => {
  const original = actor();
  const once = applyUpdate(original, planApply(original, entryFor(null)));
  const newer = 'modules/sargas-pf2-creature-images/assets/creatures/portraits/other.webp';
  const update = planApply(once, entryFor(null, newer));
  assert.equal(update.img, newer);
  assert.equal(update[`flags.${MODULE_ID}.original`], undefined);
});
