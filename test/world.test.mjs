// Runs module/scripts/world.mjs against a minimal stand-in for Foundry's globals.
import assert from 'node:assert/strict';
import { test } from 'node:test';

const MODULE_ID = 'sargas-pf2-creature-images';
const ART = `modules/${MODULE_ID}/assets/creatures/portraits`;
const NPC_ICON = 'systems/pf2e/icons/default-icons/npc.svg';

const mapping = {
  'pf2e.pathfinder-monster-core': {
    koboldId: {
      actor: `${ART}/kobold-scout-rm.webp`,
      token: {
        texture: { src: `${ART}/kobold-scout-rm.webp` },
        ring: { enabled: true, subject: { texture: `${ART}/kobold-scout-rm.webp` } },
      },
    },
    goblinId: {
      actor: `${ART}/goblin-warrior-rm.webp`,
      token: {
        texture: { src: `${ART}/goblin-warrior-rm.webp` },
        ring: { enabled: true, subject: { texture: `${ART}/goblin-warrior-rm.webp` } },
      },
    },
  },
};
// The legacy Bestiary has the same Goblin Warrior with the same art: the name fallback must still find it.
mapping['pf2e.pathfinder-bestiary'] = {
  goblinLegacyId: structuredClone(mapping['pf2e.pathfinder-monster-core'].goblinId),
};

function makeActor(id, name, level, { source, img = NPC_ICON, type = 'npc' } = {}) {
  const data = {
    _id: id,
    name,
    type,
    img,
    prototypeToken: { texture: { src: NPC_ICON }, ring: { enabled: false, subject: { texture: null } } },
    flags: {},
    system: { details: { level: { value: level } } },
    _stats: { compendiumSource: source ?? null },
  };
  return {
    get id() {
      return data._id;
    },
    get name() {
      return data.name;
    },
    get type() {
      return data.type;
    },
    get img() {
      return data.img;
    },
    get flags() {
      return data.flags;
    },
    get system() {
      return data.system;
    },
    get _stats() {
      return data._stats;
    },
    toObject: () => structuredClone(data),
    data,
  };
}

const actors = [
  makeActor('a1', 'Kobold Scout', 1, { source: 'Compendium.pf2e.pathfinder-monster-core.Actor.koboldId' }),
  makeActor('a2', 'Goblin Warrior', -1), // no compendium link: found by name + level
  makeActor('a3', 'Kobold Scout', 1, { source: 'Compendium.pf2e.pathfinder-monster-core.Actor.koboldId' }), // on a scene
  makeActor('a4', 'Kobold Scout', 1, {
    source: 'Compendium.pf2e.pathfinder-monster-core.Actor.koboldId',
    img: 'worlds/mine/kobold.webp',
  }),
  makeActor('a5', 'Mystery', 3),
  makeActor('a6', 'Amiri', 1, { type: 'character' }),
  // From a PF2e pack but deliberately unmapped (low/excluded): must not borrow Kobold Scout art by name.
  makeActor('a7', 'Kobold Scout', 1, { source: 'Compendium.pf2e.pfs-season-1-bestiary.Actor.excludedId' }),
];

/** Applies flattened update keys to the stand-in actors. */
function applyUpdates(updates) {
  for (const { _id, ...update } of updates) {
    const { data } = actors.find((a) => a.id === _id);
    for (const [key, value] of Object.entries(update)) {
      if (key.startsWith('flags.-=')) {
        delete data.flags[key.slice('flags.-='.length)];
        continue;
      }
      const parts = key.split('.');
      let target = data;
      for (const part of parts.slice(0, -1)) target = target[part] ??= {};
      target[parts.at(-1)] = value;
    }
  }
}

globalThis.foundry = { utils: { fetchJsonWithTimeout: async () => mapping }, data: {} };
globalThis.game = {
  actors,
  scenes: [{ tokens: [{ actorId: 'a3' }] }],
  packs: new Map([
    [
      'pf2e.pathfinder-monster-core',
      {
        getIndex: async () => [
          { _id: 'koboldId', name: 'Kobold Scout', system: { details: { level: { value: 1 } } } },
          { _id: 'goblinId', name: 'Goblin Warrior', system: { details: { level: { value: -1 } } } },
        ],
      },
    ],
    [
      'pf2e.pathfinder-bestiary',
      {
        getIndex: async () => [
          { _id: 'goblinLegacyId', name: 'Goblin Warrior', system: { details: { level: { value: -1 } } } },
        ],
      },
    ],
  ]),
};
const progress = [];
globalThis.ui = { notifications: { info: () => ({ update: (p) => progress.push(p.pct) }) } };
globalThis.CONFIG = { Actor: { documentClass: { updateDocuments: async (u) => applyUpdates(u) } } };

const { planWorldApply, planWorldRevert, updateActors } = await import('../module/scripts/world.mjs');

test('plan skips scene actors and unmatched NPCs, keeps custom portraits, finds unlinked actors by name', async () => {
  const { updates, counts } = await planWorldApply();
  assert.deepEqual(
    updates.map((u) => u._id),
    ['a1', 'a2', 'a4'],
  );
  // a4 keeps its custom portrait; only its still-default token is replaced.
  const a4 = updates.find((u) => u._id === 'a4');
  assert.equal(a4.img, undefined);
  assert.equal(a4['prototypeToken.texture.src'], `${ART}/kobold-scout-rm.webp`);
  assert.deepEqual(counts, { update: 3, upToDate: 0, custom: 0, onScenes: 1, unmatched: 2 });
});

test('apply then revert round-trips the world actors', async () => {
  const before = structuredClone(actors.map((a) => a.data));
  const { updates } = await planWorldApply();
  await updateActors(updates, 'applying');
  assert.equal(actors[0].img, `${ART}/kobold-scout-rm.webp`);
  assert.equal(actors[1].data.prototypeToken.texture.src, `${ART}/goblin-warrior-rm.webp`);
  assert.equal(actors[2].img, NPC_ICON, 'actor on a scene is untouched');
  assert.equal(progress.at(-1), 1);

  const again = await planWorldApply();
  assert.equal(again.counts.update, 0);
  assert.equal(again.counts.upToDate, 2);
  assert.equal(again.counts.custom, 1);

  await updateActors(planWorldRevert(), 'reverting');
  assert.deepEqual(
    actors.map((a) => a.data),
    before,
  );
});
