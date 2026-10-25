// Pre-commit guard: the repo is public, so creature art and raw Demiplane responses must never be committed.
import { execFileSync } from 'node:child_process';

const FORBIDDEN = [/^module\/assets\/creatures\/(?!\.gitkeep$)/, /^scripts\/\.cache\//, /^dist\//];

const staged = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

const blocked = staged.filter((file) => FORBIDDEN.some((re) => re.test(file)));
if (blocked.length) {
  console.error('Refusing to commit creature art / cached Demiplane data:');
  for (const file of blocked) console.error(`  ${file}`);
  console.error('Unstage with: git restore --staged <file>');
  process.exit(1);
}
