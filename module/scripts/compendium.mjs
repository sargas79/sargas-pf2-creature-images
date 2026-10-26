// Turns this module's compendium art on or off through Foundry's own Compendium Art preferences (the same
// switches as Configure Settings → Compendium Art). PF2e's packs are never modified, so this survives system
// updates and is fully reversible. It starts off: art only appears after the GM presses the button.
import { MODULE_ID } from './art.mjs';

const ART_SETTING = () => foundry.helpers?.media?.CompendiumArt?.SETTING ?? 'compendiumArtConfiguration';
export const INITIALIZED_SETTING = 'compendiumArtInitialized';

const preferences = () => foundry.utils.deepClone(game.settings.get('core', ART_SETTING()) ?? {});

export function isCompendiumArtOn() {
  const own = preferences()[MODULE_ID];
  return own?.portraits !== false || own?.tokens !== false;
}

export async function setCompendiumArt(on) {
  const config = preferences();
  config[MODULE_ID] = { ...config[MODULE_ID], portraits: on, tokens: on };
  await game.settings.set('core', ART_SETTING(), config);
  // Re-read mappings now; a reload (offered by the caller) refreshes compendium thumbnails everywhere.
  await game.compendiumArt?._registerArt?.();
}

/** On the first load after installing, switch our art off until the GM opts in with the button. */
export async function initializeCompendiumArt() {
  if (!game.user.isGM || game.settings.get(MODULE_ID, INITIALIZED_SETTING)) return;
  await setCompendiumArt(false);
  await game.settings.set(MODULE_ID, INITIALIZED_SETTING, true);
}
