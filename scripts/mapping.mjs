// Writes module/art-mapping.json (Foundry's compendiumArtMappings format) from the match table and the
// downloaded art. Only manual, exact and probable matches whose portrait is on disk are included.
//
// Usage: npm run mapping
import { existsSync } from 'node:fs';
import path from 'node:path';
import { MODULE_PATH, isDefaultImage, tokenFor } from '../module/scripts/art.mjs';
import { APPLIED_CONFIDENCE } from './lib/match.mjs';
import { IMAGES_FILE, MATCHES_FILE, MODULE_DIR, PF2E_NPCS_FILE, ROOT } from './lib/paths.mjs';
import { readJson, writeJson } from './lib/util.mjs';

export const MAPPING_FILE = path.join(MODULE_DIR, 'art-mapping.json');

async function main() {
  const { matches } = await readJson(MATCHES_FILE);
  const images = await readJson(IMAGES_FILE, {});
  const { npcs } = await readJson(PF2E_NPCS_FILE);
  const npcByUuid = new Map(npcs.map((n) => [n.uuid, n]));

  const local = (entry) =>
    entry?.file && existsSync(path.join(MODULE_DIR, entry.file)) ? `${MODULE_PATH}/${entry.file}` : null;

  const mapping = {};
  const counts = { mapped: 0, notDownloaded: 0, customArt: 0, low: 0 };
  for (const m of matches) {
    if (!APPLIED_CONFIDENCE.has(m.confidence)) {
      counts.low++;
      continue;
    }
    if (!isDefaultImage(npcByUuid.get(m.uuid)?.img)) {
      counts.customArt++;
      continue;
    }
    const art = images[m.artSlug];
    const actor = local(art?.portrait);
    if (!actor) {
      counts.notDownloaded++;
      continue;
    }
    (mapping[m.pack] ??= {})[m.id] = { actor, token: tokenFor({ actor }) };
    counts.mapped++;
  }

  await writeJson(MAPPING_FILE, mapping);
  console.log(
    `Mapped ${counts.mapped} PF2e NPCs (portrait in the dynamic token ring) to ${path.relative(ROOT, MAPPING_FILE)}. ` +
      `Skipped: ${counts.low} low-confidence, ${counts.notDownloaded} art not downloaded, ${counts.customArt} with custom art.`,
  );
}

await main();
