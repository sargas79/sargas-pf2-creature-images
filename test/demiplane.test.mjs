import assert from 'node:assert/strict';
import { test } from 'node:test';
import { artPath, buildQuery, cdnUrl, isGenericThumbnail, normalizeHit } from '../scripts/lib/demiplane.mjs';

const template = {
  indexName: 'creature_name_asc',
  params: {
    facetFilters: [['isHomebrew:false'], ['isLegacy:false'], ['nexusesIn:Pathfinder 2e'], ['showInListing:true']],
    filters: "(sourceSlugs:'monster-core')",
    page: 0,
    query: '',
  },
};

test('buildQuery swaps the legacy flag, adds the level and keeps the site filters', () => {
  const { requests } = buildQuery(template, { legacy: true, level: '-1', page: 2, hitsPerPage: 100 });
  assert.equal(requests[0].indexName, 'creature_name_asc');
  assert.deepEqual(requests[0].params.facetFilters, [
    ['isHomebrew:false'],
    ['nexusesIn:Pathfinder 2e'],
    ['showInListing:true'],
    ['isLegacy:true'],
    ['level:\\-1'],
  ]);
  assert.equal(requests[0].params.filters, "(sourceSlugs:'monster-core')");
  assert.equal(requests[0].params.page, 2);
  assert.equal(requests[0].params.hitsPerPage, 100);
});

test('normalizeHit parses JSON-string fields and keeps art paths', () => {
  const c = normalizeHit({
    slug: 'abrikandilu-rm',
    id: '123',
    name: 'Abrikandilu',
    level: '4',
    rarity: 'Common',
    size: 'Medium',
    familyName: 'Demon',
    type: '["Fiend"]',
    traits: '["Medium","Demon","Fiend","Unholy"]',
    sourceNames: '["Monster Core 2"]',
    sourceSlugs: '["monster-core-2"]',
    primarySourceName: 'Monster Core 2',
    primarySourceSlug: 'monster-core-2',
    isLegacy: 'false',
    elementImage:
      'https://content.demiplane.com/compendium/pathfinder-2e/monster-core-2/oLKvctkP7FrysXKH/05-01-PZO12009 Demon_Abrikandilu.png',
    token: '/elements/pathfinder-2e/creatures/thumbnail/MC2-Abrikandilu-NPC.png',
    elementThumbnail:
      'https://content.demiplane.com/elements/pathfinder-2e/creatures/thumbnail/05-01-PZO12009 Demon_Abrikandilu-T.png',
    elementDisplay: '<p>huge stat block</p>',
  });
  assert.equal(c.level, 4);
  assert.equal(c.legacy, false);
  assert.deepEqual(c.traits, ['Medium', 'Demon', 'Fiend', 'Unholy']);
  assert.equal(c.art.token, '/elements/pathfinder-2e/creatures/thumbnail/MC2-Abrikandilu-NPC.png');
  assert.match(c.art.image, /^\/compendium\/pathfinder-2e\/monster-core-2\//);
  assert.ok(c.art.thumbnail);
  assert.equal(c.elementDisplay, undefined);
});

test('creatures without art get nulls, and type placeholders are not thumbnails', () => {
  const c = normalizeHit({
    slug: 'derv',
    level: '7',
    isLegacy: 'false',
    elementImage: 'null',
    token: '',
    elementThumbnail: 'https://content.demiplane.com/elements/pathfinder-2e/creatures/thumbnail/undead.jpg',
  });
  assert.deepEqual(c.art, { image: null, token: null, thumbnail: null });
  assert.equal(isGenericThumbnail('/elements/pathfinder-2e/creatures/thumbnail/fiend.jpg'), true);
  assert.equal(isGenericThumbnail('/elements/pathfinder-2e/creatures/thumbnail/03-04-giant stag beetle-T.png'), false);
});

test('cdnUrl encodes raw and already-encoded paths the same way', () => {
  const raw = cdnUrl('/compendium/x/05-01 Demon_Abrikandilu.png', 1024);
  const encoded = cdnUrl(artPath('https://content.demiplane.com/compendium/x/05-01 Demon_Abrikandilu.png'), 1024);
  assert.equal(raw, 'https://images.demiplane.com/compendium/x/05-01%20Demon_Abrikandilu.png?format=webp&width=1024');
  assert.equal(encoded, raw);
});
