// GM window opened from the module settings: shows what Apply would change, then applies or reverts it.
import { planWorldApply, planWorldRevert, updateActors } from './world.mjs';

const { ApplicationV2, DialogV2 } = foundry.applications.api;
const t = (key, data) => game.i18n.format(`SARGAS_PF2_IMAGES.Manager.${key}`, data);

export class ArtManager extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: 'sargas-pf2-creature-images-manager',
    window: { title: 'SARGAS_PF2_IMAGES.Manager.Title', icon: 'fa-solid fa-dragon' },
    position: { width: 460 },
    actions: {
      apply: ArtManager.#onApply,
      revert: ArtManager.#onRevert,
    },
  };

  #plan;
  #revertCount = 0;

  async _prepareContext() {
    this.#plan = await planWorldApply();
    this.#revertCount = planWorldRevert().length;
    return {};
  }

  async _renderHTML() {
    const { counts } = this.#plan;
    const section = document.createElement('section');
    section.classList.add('standard-form');

    const intro = document.createElement('p');
    intro.textContent = t('Intro');
    const list = document.createElement('ul');
    for (const [key, value] of Object.entries(counts)) {
      const li = document.createElement('li');
      li.textContent = t(`Count.${key}`, { count: value });
      list.append(li);
    }

    const footer = document.createElement('footer');
    footer.classList.add('form-footer');
    footer.append(
      button('apply', 'fa-solid fa-paintbrush', t('Apply', { count: counts.update }), counts.update === 0),
      button('revert', 'fa-solid fa-rotate-left', t('Revert', { count: this.#revertCount }), this.#revertCount === 0),
    );
    section.append(intro, list, footer);
    return section;
  }

  _replaceHTML(result, content) {
    content.replaceChildren(result);
  }

  static async #onApply() {
    const { updates } = this.#plan;
    const ok = await DialogV2.confirm({
      window: { title: 'SARGAS_PF2_IMAGES.Manager.Title' },
      content: `<p>${t('ConfirmApply', { count: updates.length })}</p>`,
    });
    if (!ok) return;
    await updateActors(updates, t('Applying', { count: updates.length }));
    ui.notifications.info(t('Applied', { count: updates.length }));
    this.render();
  }

  static async #onRevert() {
    const updates = planWorldRevert();
    const ok = await DialogV2.confirm({
      window: { title: 'SARGAS_PF2_IMAGES.Manager.Title' },
      content: `<p>${t('ConfirmRevert', { count: updates.length })}</p>`,
    });
    if (!ok) return;
    await updateActors(updates, t('Reverting', { count: updates.length }));
    ui.notifications.info(t('Reverted', { count: updates.length }));
    this.render();
  }
}

function button(action, icon, label, disabled) {
  const el = document.createElement('button');
  el.type = 'button';
  el.dataset.action = action;
  el.disabled = disabled;
  el.innerHTML = `<i class="${icon}"></i>`;
  el.append(` ${label}`);
  return el;
}
