// Guard: the repo is public, so creature art and raw Demiplane responses must never be committed.
// Checks staged files (pre-commit hook), or every tracked file with --all (CI).
import { execFileSync } from 'node:child_process';

const FORBIDDEN = [/^module\/assets\/creatures\/(?!\.gitkeep$)/, /^scripts\/\.cache\//, /^dist\//];

const args = process.argv.includes('--all') ? ['ls-files'] : ['diff', '--cached', '--name-only', '--diff-filter=ACMR'];
const files = execFileSync('git', args, { encoding: 'utf8' }).split('\n').filter(Boolean);

const blocked = files.filter((file) => FORBIDDEN.some((re) => re.test(file)));
if (blocked.length) {
  console.error('Creature art / cached Demiplane data must not be committed:');
  for (const file of blocked) console.error(`  ${file}`);
  console.error('Unstage with: git restore --staged <file>');
  process.exit(1);
}
