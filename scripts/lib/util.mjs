import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

/** Waits `ms` plus up to 25% random jitter, so requests don't arrive on a fixed beat. */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms + Math.random() * ms * 0.25));

export async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT' && fallback !== undefined) return fallback;
    throw err;
  }
}

export async function writeJson(file, data) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(data, null, 2) + '\n');
}

/** Thrown when Demiplane refuses or blocks us. We stop instead of retrying around it. */
export class StopError extends Error {}
