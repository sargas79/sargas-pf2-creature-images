import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'dist/', 'scripts/.cache/'] },
  js.configs.recommended,
  {
    files: ['scripts/**/*.mjs', 'test/**/*.mjs', '*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: globals.node },
  },
  {
    // page.evaluate() callbacks run in the browser
    files: ['scripts/crawl.mjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
];
