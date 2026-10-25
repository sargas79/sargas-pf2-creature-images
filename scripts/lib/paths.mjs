import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const MODULE_ID = 'sargas-pf2-creature-images';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const MODULE_DIR = path.join(ROOT, 'module');
export const ART_DIR = path.join(MODULE_DIR, 'assets', 'creatures');
export const DIST_DIR = path.join(ROOT, 'dist', MODULE_ID);
export const DATA_DIR = path.join(ROOT, 'scripts', 'data');
export const CACHE_DIR = path.join(ROOT, 'scripts', '.cache');
export const CREATURES_FILE = path.join(DATA_DIR, 'creatures.json');
export const IMAGES_FILE = path.join(DATA_DIR, 'images.json');
export const PF2E_NPCS_FILE = path.join(DATA_DIR, 'pf2e-npcs.json');
export const MATCHES_FILE = path.join(DATA_DIR, 'matches.json');
export const MATCH_REPORT_FILE = path.join(DATA_DIR, 'match-report.md');
