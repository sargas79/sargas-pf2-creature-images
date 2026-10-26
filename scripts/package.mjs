// Builds the module and packs it for a release: dist/sargas-pf2-creature-images.zip (module files at the zip root,
// as Foundry expects) plus dist/module.json for the manifest URL.
import { execFileSync } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { copyFile } from 'node:fs/promises';
import path from 'node:path';
import { ZipArchive } from 'archiver';
import { DIST_DIR, MODULE_ID, ROOT } from './lib/paths.mjs';

execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'build.mjs')], { stdio: 'inherit' });

const zipFile = path.join(ROOT, 'dist', `${MODULE_ID}.zip`);
await new Promise((resolve, reject) => {
  const output = createWriteStream(zipFile);
  // WebP is already compressed; storing it is as small and much faster.
  const archive = new ZipArchive({ store: true });
  output.on('close', resolve);
  archive.on('error', reject);
  archive.pipe(output);
  archive.directory(DIST_DIR, false);
  archive.finalize();
});
await copyFile(path.join(DIST_DIR, 'module.json'), path.join(ROOT, 'dist', 'module.json'));
console.log(`Packed ${path.relative(ROOT, zipFile)} and dist/module.json`);
