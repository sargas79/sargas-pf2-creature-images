// Applies and reverts art on world actors. Never touches tokens placed on scenes, and skips any actor that has
// a token on a scene, so nothing in use changes. The mapping file is read from this module's own folder.
import { MODULE_ID, MODULE_PATH, planApply, planRevert } from './art.mjs';

const BATCH_SIZE = 100;
let mappingPromise;

function loadMapping() {
  mappingPromise ??= foundry.utils.fetchJsonWithTimeout(`${MODULE_PATH}/art-mapping.json`);
  return mappingPromise;
}

function entryForUuid(mapping, uuid) {
  const m = uuid?.match(/^Compendium\.(.+)\.Actor\.([^.]+)$/);
  return m ? (mapping[m[1]]?.[m[2]] ?? null) : null;
}

const nameKey = (name, level) => `${name.trim().toLowerCase()}|${level}`;

/** Name+level -> mapping entry, for world actors that lost their compendium link. Ambiguous names are dropped. */
async function nameIndex(mapping) {
  const index = new Map();
  for (const [packId, entries] of Object.entries(mapping)) {
    const pack = game.packs.get(packId);
    if (!pack) continue;
    for (const doc of await pack.getIndex({ fields: ['system.details.level.value'] })) {
      const entry = entries[doc._id];
      if (!entry) continue;
      const key = nameKey(doc.name, doc.system?.details?.level?.value);
      index.set(key, index.has(key) && index.get(key) !== entry ? null : entry);
    }
  }
  return index;
}

function actorsOnScenes() {
  const ids = new Set();
  for (const scene of game.scenes) for (const token of scene.tokens) if (token.actorId) ids.add(token.actorId);
  return ids;
}

/** Update key that removes this module's flags (Foundry v14 deletion operator, or the older "-=" key). */
function deleteFlagUpdate() {
  const Deletion = foundry.data?.operators?.ForcedDeletion;
  if (!Deletion) return { [`flags.-=${MODULE_ID}`]: null };
  return { [`flags.${MODULE_ID}`]: typeof Deletion.create === 'function' ? Deletion.create() : new Deletion() };
}

/** Works out what Apply would do, without changing anything. */
export async function planWorldApply() {
  const mapping = await loadMapping();
  const byName = await nameIndex(mapping);
  const onScenes = actorsOnScenes();
  const updates = [];
  const counts = { update: 0, upToDate: 0, custom: 0, onScenes: 0, unmatched: 0 };

  for (const actor of game.actors) {
    if (actor.type !== 'npc') continue;
    const source = actor._stats?.compendiumSource ?? actor.flags?.core?.sourceId;
    const entry =
      entryForUuid(mapping, source) ?? byName.get(nameKey(actor.name, actor.system?.details?.level?.value)) ?? null;
    if (!entry) {
      counts.unmatched++;
      continue;
    }
    if (onScenes.has(actor.id)) {
      counts.onScenes++;
      continue;
    }
    const update = planApply(actor.toObject(), entry);
    if (update) {
      updates.push({ _id: actor.id, ...update });
      counts.update++;
    } else if (actor.img === entry.actor) counts.upToDate++;
    else counts.custom++;
  }
  return { updates, counts };
}

export function planWorldRevert() {
  const deleteFlag = deleteFlagUpdate();
  const updates = [];
  for (const actor of game.actors) {
    const update = planRevert(actor.toObject(), deleteFlag);
    if (update) updates.push({ _id: actor.id, ...update });
  }
  return updates;
}

export async function updateActors(updates, message) {
  const progress = ui.notifications.info(message, { progress: true });
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    await CONFIG.Actor.documentClass.updateDocuments(updates.slice(i, i + BATCH_SIZE));
    progress?.update?.({ pct: Math.min(1, (i + BATCH_SIZE) / updates.length) });
  }
}
