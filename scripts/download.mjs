// Downloads creature portraits listed in scripts/data/creatures.json into module/assets/creatures/portraits/.
//
// Portraits come from `art.image`. Demiplane's token art (`art.token`) has a gold frame painted in, so it isn't
// downloaded: tokens use the portrait inside Foundry's dynamic ring. Images are requested from Demiplane's resizing
// CDN as WebP, so nothing full-size is pulled. Art shared by several creatures is downloaded once.
// scripts/data/images.json records what each creature got, so re-runs skip finished files. Links the CDN can't serve
// are recorded as `missing` and skipped on later runs (--retry-missing tries them again).
//
// Usage: npm run download -- [--delay 1500] [--portrait-width 1024] [--limit 10] [--only a,b] [--retry-missing]
import { createHash } from 'node:crypto';
import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import sharp from 'sharp';
import { cdnUrl } from './lib/demiplane.mjs';
import { ART_DIR, CREATURES_FILE, IMAGES_FILE, MODULE_DIR } from './lib/paths.mjs';
import { StopError, readJson, sleep, writeJson } from './lib/util.mjs';

const { values: args } = parseArgs({
  options: {
    delay: { type: 'string', default: '1500' },
    'portrait-width': { type: 'string', default: '1024' },
    limit: { type: 'string' },
    only: { type: 'string' },
    'retry-missing': { type: 'boolean', default: false },
  },
});
const DELAY = Number(args.delay);
const KINDS = {
  portrait: { field: 'image', width: Number(args['portrait-width']) },
};
const USER_AGENT = 'sargas-pf2-creature-images/0.1 (personal Foundry VTT module build)';
const MAX_ATTEMPTS = 3;
// Several server errors in a row means the CDN is unhappy with us, not that one file is broken.
// A 404 is just a broken link on Demiplane's side and doesn't count.
const MAX_CONSECUTIVE_FAILURES = 5;

const exists = (file) =>
  access(file).then(
    () => true,
    () => false,
  );

/** Returns { buffer }, { missing: true } for a 404, or { failed: true } after repeated server errors. */
async function fetchImage(url) {
  for (let attempt = 1; ; attempt++) {
    let res;
    try {
      res = await fetch(url, { headers: { 'user-agent': USER_AGENT } });
    } catch (err) {
      if (attempt >= MAX_ATTEMPTS) throw err;
      await sleep(DELAY * 2 ** attempt);
      continue;
    }
    if (res.ok) return { buffer: Buffer.from(await res.arrayBuffer()) };
    if (res.status === 404) return { missing: true };
    if (res.status === 403 || res.status === 429) {
      throw new StopError(`Image CDN answered HTTP ${res.status} for ${url}. Stopping; progress is saved.`);
    }
    if (attempt >= MAX_ATTEMPTS) return { failed: true };
    await sleep(DELAY * 2 ** attempt);
  }
}

/** Makes sure we store a real WebP no wider than requested (the CDN normally already did this). */
async function toWebp(buffer, width) {
  const meta = await sharp(buffer).metadata();
  if (meta.format === 'webp' && meta.width <= width) return buffer;
  return sharp(buffer).resize({ width, withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
}

async function main() {
  const creatures = await readJson(CREATURES_FILE);
  const manifest = await readJson(IMAGES_FILE, {});
  const only = args.only?.split(',').map((s) => s.trim());

  let queue = creatures.filter((c) => (only ? only.includes(c.slug) : c.art.image));
  if (args.limit) queue = queue.slice(0, Number(args.limit));

  // Source path -> stored file, seeded from earlier runs, so shared art is fetched once.
  const stored = new Map();
  for (const entry of Object.values(manifest)) {
    for (const kind of Object.keys(KINDS))
      if (entry[kind]?.file) stored.set(`${kind}:${entry[kind].source}`, entry[kind]);
  }

  const counts = { downloaded: 0, reused: 0, skipped: 0, missing: 0, failed: 0 };
  let consecutiveFailures = 0;
  try {
    for (const [i, creature] of queue.entries()) {
      for (const [kind, { field, width }] of Object.entries(KINDS)) {
        const source = creature.art[field];
        if (!source) continue;

        const done = manifest[creature.slug]?.[kind];
        if (done?.source === source && done.missing && !args['retry-missing']) {
          counts.missing++;
          continue;
        }
        if (done?.source === source && done.file && (await exists(path.join(MODULE_DIR, done.file)))) {
          counts.skipped++;
          continue;
        }

        const key = `${kind}:${source}`;
        const shared = stored.get(key);
        if (shared && (await exists(path.join(MODULE_DIR, shared.file)))) {
          (manifest[creature.slug] ??= {})[kind] = shared;
          counts.reused++;
          continue;
        }

        const result = await fetchImage(cdnUrl(source, width));
        await sleep(DELAY);
        if (result.failed || result.missing) {
          // The CDN answers broken links with 404 or a persistent 5xx; remember them so re-runs don't retry.
          console.warn(`  ${result.failed ? 'failed' : 'missing'} ${kind} for ${creature.slug}: ${source}`);
          (manifest[creature.slug] ??= {})[kind] = { source, missing: true };
          if (result.missing) {
            counts.missing++;
            continue;
          }
          counts.failed++;
          if (++consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            throw new StopError(`${consecutiveFailures} images in a row failed. Stopping; progress is saved.`);
          }
          continue;
        }
        consecutiveFailures = 0;
        const webp = await toWebp(result.buffer, width);
        const file = path.join(ART_DIR, `${kind}s`, `${creature.slug}.webp`);
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, webp);

        const entry = {
          file: path.relative(MODULE_DIR, file).split(path.sep).join('/'),
          source,
          sha256: createHash('sha256').update(webp).digest('hex'),
        };
        (manifest[creature.slug] ??= {})[kind] = entry;
        stored.set(key, entry);
        counts.downloaded++;
      }
      if ((i + 1) % 25 === 0) {
        await writeJson(IMAGES_FILE, manifest);
        console.log(`  ${i + 1}/${queue.length} creatures`);
      }
    }
  } finally {
    await writeJson(IMAGES_FILE, manifest);
  }
  console.log(
    `Done: ${counts.downloaded} downloaded, ${counts.reused} reused shared art, ` +
      `${counts.skipped} already present, ${counts.missing} missing on CDN, ${counts.failed} failed.`,
  );
}

main().catch((err) => {
  console.error(err instanceof StopError ? `STOPPED: ${err.message}` : err);
  process.exit(1);
});
