// Entry point. Everything this module shows is local: it never contacts Demiplane or any other site.
// Compendium art is registered through the compendiumArtMappings flag in module.json and switched on from the
// GM menu; the same menu applies art to creatures already in the world.
import { ArtManager } from './art-manager.mjs';
import { MODULE_ID } from './art.mjs';
import { INITIALIZED_SETTING, initializeCompendiumArt } from './compendium.mjs';

Hooks.once('init', () => {
  game.settings.register(MODULE_ID, INITIALIZED_SETTING, {
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });
  game.settings.registerMenu(MODULE_ID, 'artManager', {
    name: 'SARGAS_PF2_IMAGES.Menu.Name',
    label: 'SARGAS_PF2_IMAGES.Menu.Label',
    hint: 'SARGAS_PF2_IMAGES.Menu.Hint',
    icon: 'fa-solid fa-dragon',
    type: ArtManager,
    restricted: true,
  });
});

Hooks.once('ready', () => initializeCompendiumArt());
