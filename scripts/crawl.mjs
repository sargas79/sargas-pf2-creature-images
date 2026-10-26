// Collects the Demiplane PF2e creature index into scripts/data/creatures.json.
//
// Opens the creature list once in a real browser, captures the listing request the site itself makes, then replays
// it (narrowed by legacy flag and level) from inside the page. Each response is cached in scripts/.cache/list, so
// re-runs only fetch what is missing. Any refusal from Demiplane stops the run; nothing tries to get around it.
//
// Usage: npm run crawl -- [--delay 4000] [--hits-per-page 100] [--levels 4,5] [--headed]
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';
import { LIST_URL, LISTING_API, MAX_HITS_PER_QUERY, buildQuery, normalizeHit } from './lib/demiplane.mjs';
import { CACHE_DIR, CREATURES_FILE } from './lib/paths.mjs';
import { StopError, readJson, sleep, writeJson } from './lib/util.mjs';

const { values: args } = parseArgs({
  options: {
    delay: { type: 'string', default: '4000' },
    'hits-per-page': { type: 'string', default: '100' },
    levels: { type: 'string' },
    headed: { type: 'boolean', default: false },
  },
});
const DELAY = Number(args.delay);
const HITS_PER_PAGE = Number(args['hits-per-page']);
const ONLY_LEVELS = args.levels?.split(',').map((l) => l.trim());
const LIST_CACHE = path.join(CACHE_DIR, 'list');

/** Captures the site's own listing request (body + headers) as the template for ours. */
async function openListing(page) {
  const requestPromise = page.waitForRequest(
    (req) => req.url().includes('/api/listing-search') && req.method() === 'POST',
    { timeout: 60_000 },
  );
  await page.goto(LIST_URL, { waitUntil: 'domcontentloaded' });
  const request = await requestPromise.catch(() => {
    throw new StopError('The creature list never loaded (no listing request within 60s). Is the site blocking us?');
  });
  const body = JSON.parse(request.postData());
  const headers = Object.fromEntries(
    Object.entries(await request.allHeaders()).filter(([k]) => k === 'content-type' || k.startsWith('x-')),
  );
  return { template: body.requests[0], headers };
}

async function search(page, headers, body) {
  const res = await page.evaluate(
    async ({ api, headers, body }) => {
      const r = await fetch(api, { method: 'POST', headers, body: JSON.stringify(body) });
      return { status: r.status, text: await r.text() };
    },
    { api: LISTING_API, headers, body },
  );
  if (res.status !== 200) throw new StopError(`Demiplane answered HTTP ${res.status}. Stopping; progress is cached.`);
  let json;
  try {
    json = JSON.parse(res.text);
  } catch {
    throw new StopError('Demiplane answered with something that is not JSON (challenge page?). Stopping.');
  }
  const result = json.results?.[0];
  if (!result) throw new StopError('Unexpected listing response shape. Stopping.');
  return result;
}

/** Cached search: a cached slice is never requested again. */
async function cachedSearch(page, headers, name, body) {
  const file = path.join(LIST_CACHE, `${name}.json`);
  const cached = await readJson(file, null);
  if (cached) return { result: cached, fromCache: true };
  const result = await search(page, headers, body);
  await writeJson(file, result);
  return { result, fromCache: false };
}

async function main() {
  await mkdir(LIST_CACHE, { recursive: true });
  const browser = await chromium.launch({ headless: !args.headed });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const hits = new Map();
  let requests = 0;

  const politeSearch = async (name, body) => {
    const out = await cachedSearch(page, headers, name, body);
    if (!out.fromCache) {
      requests++;
      await sleep(DELAY);
    }
    return out.result;
  };

  console.log(`Opening ${LIST_URL}`);
  const { template, headers } = await openListing(page);
  await sleep(DELAY);

  try {
    for (const legacy of [false, true]) {
      const facetResult = await politeSearch(
        `levels-legacy-${legacy}`,
        buildQuery(template, { legacy, facets: ['level'] }),
      );
      const levels = Object.entries(facetResult.facets?.level ?? {}).sort(([a], [b]) => Number(a) - Number(b));
      console.log(`${legacy ? 'Legacy' : 'Current'}: ${facetResult.nbHits} creatures over ${levels.length} levels`);

      for (const [level, expected] of levels) {
        if (ONLY_LEVELS && !ONLY_LEVELS.includes(level)) continue;
        if (expected > MAX_HITS_PER_QUERY) {
          throw new StopError(`Level ${level} has ${expected} creatures, above the ${MAX_HITS_PER_QUERY} paging cap.`);
        }
        let got = 0;
        for (let pageNo = 0; ; pageNo++) {
          const result = await politeSearch(
            `legacy-${legacy}-level-${level}-hpp-${HITS_PER_PAGE}-page-${pageNo}`,
            buildQuery(template, { legacy, level, page: pageNo, hitsPerPage: HITS_PER_PAGE }),
          );
          for (const hit of result.hits) hits.set(hit.slug, normalizeHit(hit));
          got += result.hits.length;
          if (pageNo + 1 >= result.nbPages || result.hits.length === 0) break;
        }
        // More hits than the facet count means the level filter did not apply.
        if (got > expected) throw new StopError(`Level ${level} returned ${got} creatures, expected ${expected}.`);
        const note = got === expected ? '' : `  (expected ${expected})`;
        console.log(`  level ${level.padStart(2)}: ${got}${note}`);
      }
    }
  } finally {
    await browser.close();
  }

  // A --levels run refreshes only those levels; keep everything else from the existing index.
  if (ONLY_LEVELS) {
    for (const c of await readJson(CREATURES_FILE, [])) {
      if (!ONLY_LEVELS.includes(String(c.level)) && !hits.has(c.slug)) hits.set(c.slug, c);
    }
  }
  const creatures = [...hits.values()].sort((a, b) => a.slug.localeCompare(b.slug));
  await writeJson(CREATURES_FILE, creatures);
  const withImage = creatures.filter((c) => c.art.image).length;
  const withToken = creatures.filter((c) => c.art.token).length;
  console.log(
    `Saved ${creatures.length} creatures (${withImage} with art, ${withToken} with token art) ` +
      `to ${path.relative(process.cwd(), CREATURES_FILE)}; ${requests} new requests.`,
  );
}

main().catch((err) => {
  console.error(err instanceof StopError ? `STOPPED: ${err.message}` : err);
  process.exit(1);
});
