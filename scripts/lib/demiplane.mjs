// Pure helpers for Demiplane's creature listing API (an Algolia-style search proxy). No network access here.

export const LIST_URL = 'https://app.demiplane.com/nexus/pathfinder2e/creatures';
export const LISTING_API = '/api/listing-search-sst?nexusSlug=pathfinder2e';
export const IMAGE_CDN = 'https://images.demiplane.com';

/** The search backend refuses to page past this many hits per query, so queries are split by level. */
export const MAX_HITS_PER_QUERY = 1000;

/**
 * Builds a listing request from the one the site itself sent, narrowed to one legacy flag + level.
 * Keeps the site's own source filter and listing flags, so we see exactly what the site lists.
 */
export function buildQuery(template, { legacy, level, page = 0, hitsPerPage = 0, facets }) {
  const baseFilters = (template.params.facetFilters ?? []).filter(
    (group) => !group.some((f) => f.startsWith('isLegacy:') || f.startsWith('level:')),
  );
  const facetFilters = [...baseFilters, [`isLegacy:${legacy}`]];
  if (level !== undefined) facetFilters.push([`level:${level}`]);
  return {
    requests: [
      {
        indexName: template.indexName,
        params: {
          ...template.params,
          facetFilters,
          facets: facets ?? [],
          page,
          hitsPerPage,
        },
      },
    ],
  };
}

const parseJsonField = (value, fallback) => {
  if (value === null || value === undefined || value === '' || value === 'null') return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const nullable = (value) => (value === null || value === undefined || value === '' || value === 'null' ? null : value);

/** Strips the host so art can be fetched from the image CDN; returns null for missing art. */
export function artPath(value) {
  const v = nullable(value);
  if (!v) return null;
  return v.startsWith('http') ? new URL(v).pathname : v;
}

/** Type-based placeholder thumbnails (e.g. `undead.jpg`, `fiend.jpg`) are not creature art. */
export function isGenericThumbnail(pathname) {
  if (!pathname) return true;
  return /\/thumbnail\/[a-z-]+\.(jpe?g|png)$/.test(pathname);
}

/** Reduces a listing hit to what matching and downloading need (drops the stat block HTML). */
export function normalizeHit(hit) {
  const thumbnail = artPath(hit.elementThumbnail);
  return {
    slug: hit.slug,
    id: String(hit.id ?? hit.objectID),
    name: hit.name,
    level: Number(hit.level),
    rarity: nullable(hit.rarity),
    size: nullable(hit.size),
    family: nullable(hit.familyName),
    types: parseJsonField(hit.type, []),
    traits: parseJsonField(hit.traits, []),
    sources: parseJsonField(hit.sourceNames, []),
    sourceSlugs: parseJsonField(hit.sourceSlugs, []),
    primarySource: nullable(hit.primarySourceName),
    primarySourceSlug: nullable(hit.primarySourceSlug),
    legacy: hit.isLegacy === true || hit.isLegacy === 'true',
    art: {
      image: artPath(hit.elementImage),
      token: artPath(hit.token),
      thumbnail: isGenericThumbnail(thumbnail) ? null : thumbnail,
    },
  };
}

const safeDecode = (part) => {
  try {
    return decodeURIComponent(part);
  } catch {
    return part;
  }
};

/** CDN URL for an art path, resized server-side (the same way the site requests it). */
export function cdnUrl(pathname, width) {
  const encoded = pathname
    .split('/')
    .map((part) => encodeURIComponent(safeDecode(part)))
    .join('/');
  return `${IMAGE_CDN}${encoded}?format=webp&width=${width}`;
}
