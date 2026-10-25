import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  baseName,
  dragonNames,
  indexDemiplane,
  matchNpc,
  normalizeName,
  normalizeSource,
} from '../scripts/lib/match.mjs';

const dp = (slug, name, level, { legacy = false, image = `/art/${slug}.png`, token = null, sources = [] } = {}) => ({
  slug,
  name,
  level,
  legacy,
  sources,
  art: { image, token, thumbnail: null },
});

const npc = (name, level, source, pack = 'pf2e.test') => ({
  uuid: `Compendium.${pack}.Actor.${name}`,
  pack,
  id: name,
  name,
  level,
  source,
});

test('normalizeName folds case, accents and quotes', () => {
  assert.equal(normalizeName('“Lucky” Lanks'), 'lucky lanks');
  assert.equal(normalizeName("Il'setsya Wyrmtouched"), 'ilsetsya wyrmtouched');
  assert.equal(normalizeName('Kobold Scout (PFS 1-11)'), 'kobold scout (pfs 1 11)');
  assert.equal(baseName('kobold scout (pfs 1 11)'), 'kobold scout');
});

test('dragon names are rewritten the way Demiplane writes them', () => {
  assert.deepEqual(dragonNames('blue dragon (adult)'), ['adult blue dragon']);
  assert.deepEqual(dragonNames('rime dragon (adult spellcaster)'), [
    'adult rime dragon (spellcaster)',
    'adult rime dragon',
  ]);
  assert.deepEqual(dragonNames('kobold scout'), []);
});

test('sources match across Pathfinder naming styles', () => {
  assert.equal(normalizeSource('Pathfinder Monster Core 2'), normalizeSource('Monster Core 2'));
  assert.equal(
    normalizeSource('Pathfinder #149: Against the Scarlet Triad'),
    normalizeSource('Against the Scarlet Triad'),
  );
  assert.equal(normalizeSource('Pathfinder Kingmaker'), normalizeSource('Kingmaker Adventure Path'));
  assert.notEqual(normalizeSource('Pathfinder Bestiary'), normalizeSource('Bestiary 2'));
});

test('remaster art wins over the legacy entry the NPC matches', () => {
  const index = indexDemiplane([
    dp('kobold-scout', 'Kobold Scout', 1, { legacy: true, image: null, sources: ['Bestiary'] }),
    dp('kobold-scout-rm', 'Kobold Scout', 1, { sources: ['Bestiary', 'Monster Core'] }),
  ]);
  const m = matchNpc(npc('Kobold Scout', 1, 'Pathfinder Bestiary'), index);
  assert.equal(m.confidence, 'exact');
  assert.equal(m.artSlug, 'kobold-scout-rm');
  assert.equal(m.image, '/art/kobold-scout-rm.png');
});

test('variants: PFS level ranges and Weak/Elite borrow the base creature', () => {
  const index = indexDemiplane([dp('reefclaw-rm', 'Reefclaw', 1), dp('ceustodaemon', 'Ceustodaemon', 6)]);
  assert.equal(matchNpc(npc('Reefclaw (PFS 1-12)', 2, 'Pathfinder Society'), index).confidence, 'probable');
  assert.equal(matchNpc(npc('Weak Ceustodaemon (PFS 1-01)', 5, 'Pathfinder Society'), index).confidence, 'probable');
});

test('a level mismatch is low confidence and no art means no match', () => {
  const index = indexDemiplane([dp('palace-guard-rm', 'Palace Guard', 4), dp('derv', 'Derv', 7, { image: null })]);
  assert.equal(matchNpc(npc('Palace Guard', 15, "Hell's Destiny"), index).confidence, 'low');
  assert.equal(matchNpc(npc('Derv', 7, 'Cult of the Cave Worm'), index), null);
});

test('same name and level with different art and no source to choose is flagged', () => {
  const index = indexDemiplane([
    dp('guard-a', 'Guard', 2, { sources: ['Book A'] }),
    dp('guard-b', 'Guard', 2, { sources: ['Book B'] }),
  ]);
  const m = matchNpc(npc('Guard', 2, 'Book C'), index);
  assert.equal(m.confidence, 'low');
  assert.ok(m.reasons.some((r) => r.startsWith('ambiguous')));
});
