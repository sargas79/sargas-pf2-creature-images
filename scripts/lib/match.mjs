// Matches PF2e compendium NPCs to Demiplane creatures. Pure functions; scripts/match.mjs does the I/O.
//
// Confidence tiers:
//   exact     same name, same level, and a shared source book
//   probable  same name and level without a shared source, or the same creature under a variant name
//             (e.g. "Kobold Scout (PFS 1-11)", "Blue Dragon (Adult)") at the same level
//   low       name matches but the level differs; kept for review, not applied by default
// Art follows the remaster: a legacy match borrows its `-rm` twin's art, and a remaster match without art
// falls back to its legacy twin.

export const CONFIDENCE = ['exact', 'probable', 'low'];

export function normalizeName(name) {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[‘’“”"'`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9()]+/g, ' ')
    .replace(/\s*\(\s*/g, ' (')
    .replace(/\s*\)\s*/g, ') ')
    .trim();
}

/** Drops trailing parentheticals: "kobold scout (pfs 1 11)" -> "kobold scout". */
export const baseName = (normalized) => normalized.replace(/(\s*\([^)]*\))+$/, '').trim();

/** PF2e "blue dragon (adult, spellcaster)" -> Demiplane-style names, most specific first. */
export function dragonNames(normalized) {
  const m = normalized.match(/^(.*\bdragon) \((young|adult|ancient)( spellcaster)?\)$/);
  if (!m) return [];
  const plain = `${m[2]} ${m[1]}`;
  return m[3] ? [`${plain} (spellcaster)`, plain] : [plain];
}

export function normalizeSource(source) {
  return (source ?? '')
    .toLowerCase()
    .replace(/\(legacy\)|legacy edition|remastered|hardcover compilation|adventure path$/g, '')
    .replace(/^paizo blog:|^pathfinder #\d+:|^pathfinder society( scenario)?( #[\d-]+)?:?/g, '')
    .replace(/^pathfinder /, '')
    .replace(/^(adventure path|adventures?|game night):/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** "weak ceustodaemon (pfs 1 01)" -> "ceustodaemon": Weak/Elite adjustments share the base creature's art. */
const stripAdjustment = (normalized) => normalized.replace(/^(weak|elite) /, '');

/** PFS-style level-range tags, e.g. "(3 4)", "(pfs 1 11)": scaled versions of the base creature. */
const LEVEL_RANGE_TAG = /\((pfs )?\d+ \d+\)$/;

/** Index of Demiplane creatures by normalized full name, plus a slug lookup for remaster twins. */
export function indexDemiplane(creatures) {
  const byName = new Map();
  const bySlug = new Map();
  for (const c of creatures) {
    const entry = { ...c, sourceKeys: new Set(c.sources.map(normalizeSource).filter(Boolean)) };
    const key = normalizeName(c.name);
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(entry);
    bySlug.set(c.slug, entry);
  }
  return { byName, bySlug };
}

/** Picks the art for a matched Demiplane creature, preferring the remastered twin. */
export function resolveArt(match, bySlug) {
  const remaster = match.slug.endsWith('-rm') ? match : bySlug.get(`${match.slug}-rm`);
  const legacy = match.slug.endsWith('-rm') ? bySlug.get(match.slug.slice(0, -3)) : match;
  for (const c of [remaster, match, legacy]) if (c?.art.image) return c;
  return null;
}

function rank(candidates, npc, sourceKey) {
  return candidates
    .map((c) => {
      const levelDiff = Math.abs(c.level - npc.level);
      const sharedSource = Boolean(sourceKey) && c.sourceKeys.has(sourceKey);
      return { c, levelDiff, sharedSource };
    })
    .sort(
      (a, b) =>
        a.levelDiff - b.levelDiff ||
        Number(b.sharedSource) - Number(a.sharedSource) ||
        Number(Boolean(b.c.art.image)) - Number(Boolean(a.c.art.image)) ||
        Number(a.c.legacy) - Number(b.c.legacy) ||
        a.c.slug.localeCompare(b.c.slug),
    );
}

/**
 * Finds the Demiplane creature for one PF2e NPC. Returns null when nothing usable matches.
 * `index` comes from indexDemiplane().
 */
export function matchNpc(npc, { byName, bySlug }) {
  const full = normalizeName(npc.name);
  const sourceKey = normalizeSource(npc.source);
  const adjusted = stripAdjustment(full);
  // Level shifts expected from the name itself: Weak/Elite is one level, a PFS level range up to two.
  const expectedShift = (adjusted !== full ? 1 : 0) + (LEVEL_RANGE_TAG.test(full) ? 2 : 0);
  const attempts = [
    { names: [full], variant: false },
    { names: dragonNames(full), variant: true },
    { names: [adjusted, baseName(adjusted)], variant: true },
  ];

  for (const { names, variant } of attempts) {
    const candidates = names.flatMap((n) => (n && n !== (variant ? full : null) ? (byName.get(n) ?? []) : []));
    if (!candidates.length) continue;

    const [best, runnerUp] = rank(candidates, npc, sourceKey);
    const art = resolveArt(best.c, bySlug);
    if (!art) continue;

    let confidence;
    if (best.levelDiff > (variant ? expectedShift : 0)) confidence = 'low';
    else if (best.sharedSource && !variant) confidence = 'exact';
    else confidence = 'probable';

    const reasons = [];
    if (variant) reasons.push(`variant name "${best.c.name}"`);
    if (best.levelDiff) reasons.push(`level ${best.c.level} vs ${npc.level}`);
    if (!best.sharedSource) reasons.push('no shared source');
    if (art.slug !== best.c.slug) reasons.push(`art from ${art.slug}`);
    // Same name and level with different art and nothing to tell them apart: flag it.
    if (
      runnerUp &&
      runnerUp.levelDiff === best.levelDiff &&
      runnerUp.sharedSource === best.sharedSource &&
      resolveArt(runnerUp.c, bySlug)?.art.image !== art.art.image &&
      resolveArt(runnerUp.c, bySlug)?.slug !== art.slug
    ) {
      reasons.push(`ambiguous with ${runnerUp.c.slug}`);
      if (confidence === 'exact' || confidence === 'probable') confidence = 'low';
    }

    return {
      uuid: npc.uuid,
      pack: npc.pack,
      id: npc.id,
      name: npc.name,
      level: npc.level,
      confidence,
      slug: best.c.slug,
      artSlug: art.slug,
      image: art.art.image,
      token: art.art.token,
      reasons,
    };
  }
  return null;
}
