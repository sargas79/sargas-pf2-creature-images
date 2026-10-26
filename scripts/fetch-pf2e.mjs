// Builds scripts/data/pf2e-npcs.json from the PF2e system source at PF2E_TAG.
//
// Sparse-clones only the system manifest and its Actor pack folders into scripts/.cache, then keeps the NPCs.
//
// Usage: npm run fetch:pf2e
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { PF2E_REPO, PF2E_TAG, normalizeActor } from './lib/pf2e.mjs';
import { CACHE_DIR, PF2E_NPCS_FILE } from './lib/paths.mjs';
import { writeJson } from './lib/util.mjs';

const checkout = path.join(CACHE_DIR, PF2E_TAG);
const git = (...args) => execFileSync('git', args, { cwd: checkout, stdio: ['ignore', 'pipe', 'inherit'] });

async function* jsonFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* jsonFiles(full);
    else if (entry.name.endsWith('.json') && !entry.name.startsWith('_')) yield full;
  }
}

async function main() {
  if (!existsSync(checkout)) {
    console.log(`Cloning ${PF2E_REPO} at ${PF2E_TAG} (sparse)...`);
    execFileSync(
      'git',
      ['clone', '--depth', '1', '--filter=blob:none', '--sparse', '--branch', PF2E_TAG, PF2E_REPO, checkout],
      { stdio: 'inherit' },
    );
  }
  git('sparse-checkout', 'set', '--no-cone', '/system.pf2e.json');
  const manifest = JSON.parse(await readFile(path.join(checkout, 'system.pf2e.json'), 'utf8'));
  // The manifest points at built packs (packs/<name>); their JSON sources live in packs/pf2e/<name>.
  const actorPacks = manifest.packs
    .filter((p) => p.type === 'Actor')
    .map((p) => ({ name: p.name, dir: `packs/pf2e/${path.basename(p.path)}` }));
  git('sparse-checkout', 'set', '--no-cone', '/system.pf2e.json', ...actorPacks.map((p) => `/${p.dir}/`));

  const npcs = [];
  for (const pack of actorPacks) {
    const dir = path.join(checkout, pack.dir);
    if (!existsSync(dir)) continue;
    let count = 0;
    for await (const file of jsonFiles(dir)) {
      const npc = normalizeActor(JSON.parse(await readFile(file, 'utf8')), pack.name);
      if (npc) {
        npcs.push(npc);
        count++;
      }
    }
    if (count) console.log(`  ${pack.name}: ${count}`);
  }

  npcs.sort((a, b) => a.pack.localeCompare(b.pack) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  await writeJson(PF2E_NPCS_FILE, { tag: PF2E_TAG, version: manifest.version, npcs });
  console.log(`Saved ${npcs.length} NPCs from PF2e ${manifest.version}.`);
}

await main();
