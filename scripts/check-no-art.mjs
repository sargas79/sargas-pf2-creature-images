// Guard: keep raw Demiplane responses and build output out of git.
// The creature art itself is committed; the repository must stay private.
// Checks staged files (pre-commit hook), or every tracked file with --all (CI).
import { execFileSync } from 'node:child_process';

const FORBIDDEN = [/^scripts\/\.cache\//, /^dist\//];

const args = process.argv.includes('--all') ? ['ls-files'] : ['diff', '--cached', '--name-only', '--diff-filter=ACMR'];
const files = execFileSync('git', args, { encoding: 'utf8' }).split('\n').filter(Boolean);

const blocked = files.filter((file) => FORBIDDEN.some((re) => re.test(file)));
if (blocked.length) {
  console.error('Cached Demiplane data and build output must not be committed:');
  for (const file of blocked) console.error(`  ${file}`);
  console.error('Unstage with: git restore --staged <file>');
  process.exit(1);
}
