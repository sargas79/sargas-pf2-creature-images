// GM window opened from the module settings. Placeholder until apply (#8) and revert (#9) exist.
const { ApplicationV2 } = foundry.applications.api;

export class ArtManager extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: 'sargas-pf2-creature-images-manager',
    window: { title: 'SARGAS_PF2_IMAGES.Manager.Title', icon: 'fa-solid fa-dragon' },
    position: { width: 420 },
  };

  async _renderHTML() {
    const p = document.createElement('p');
    p.textContent = game.i18n.localize('SARGAS_PF2_IMAGES.Manager.Placeholder');
    return p;
  }

  _replaceHTML(result, content) {
    content.replaceChildren(result);
  }
}
