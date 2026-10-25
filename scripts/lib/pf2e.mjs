// PF2e system source data used for matching. Bump PF2E_TAG together with module.json's minimum pf2e version.
export const PF2E_REPO = 'https://github.com/foundryvtt/pf2e.git';
export const PF2E_TAG = 'pf2e-8.6.1';
export const PF2E_SYSTEM_ID = 'pf2e';

/** Reduces an actor source document to what matching needs. Returns null for anything that isn't an NPC. */
export function normalizeActor(doc, packName) {
  if (doc.type !== 'npc') return null;
  const details = doc.system?.details ?? {};
  const traits = doc.system?.traits ?? {};
  return {
    uuid: `Compendium.${PF2E_SYSTEM_ID}.${packName}.Actor.${doc._id}`,
    pack: `${PF2E_SYSTEM_ID}.${packName}`,
    id: doc._id,
    name: doc.name,
    level: details.level?.value ?? null,
    rarity: traits.rarity ?? null,
    size: traits.size?.value ?? null,
    traits: traits.value ?? [],
    source: details.publication?.title ?? null,
    remaster: details.publication?.remaster === true,
    img: doc.img ?? null,
    tokenImg: doc.prototypeToken?.texture?.src ?? null,
  };
}
