// Entry point. Everything this module shows is local: it never contacts Demiplane or any other site.
import { ArtManager } from './art-manager.mjs';
import { MODULE_ID } from './constants.mjs';

Hooks.once('init', () => {
  game.settings.registerMenu(MODULE_ID, 'artManager', {
    name: 'SARGAS_PF2_IMAGES.Menu.Name',
    label: 'SARGAS_PF2_IMAGES.Menu.Label',
    hint: 'SARGAS_PF2_IMAGES.Menu.Hint',
    icon: 'fa-solid fa-dragon',
    type: ArtManager,
    restricted: true,
  });
});
