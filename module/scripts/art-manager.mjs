// GM window opened from the module settings. Two parts: switch the compendium art on or off, and apply or revert
// art on creatures already in the world.
import { isCompendiumArtOn, setCompendiumArt } from './compendium.mjs';
import { planWorldApply, planWorldRevert, updateActors } from './world.mjs';

const { ApplicationV2, DialogV2 } = foundry.applications.api;
const t = (key, data) => game.i18n.format(`SARGAS_PF2_IMAGES.Manager.${key}`, data);

export class ArtManager extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: 'sargas-pf2-creature-images-manager',
    window: { title: 'SARGAS_PF2_IMAGES.Manager.Title', icon: 'fa-solid fa-dragon' },
    position: { width: 480 },
    actions: {
      compendiumOn: ArtManager.#onCompendiumOn,
      compendiumOff: ArtManager.#onCompendiumOff,
      apply: ArtManager.#onApply,
      revert: ArtManager.#onRevert,
    },
  };

  #plan;
  #revertCount = 0;
  #compendiumOn = false;

  async _prepareContext() {
    this.#compendiumOn = isCompendiumArtOn();
    this.#plan = await planWorldApply();
    this.#revertCount = planWorldRevert().length;
    return {};
  }

  async _renderHTML() {
    const root = document.createElement('div');
    root.classList.add('standard-form');
    root.append(this.#compendiumSection(), this.#worldSection());
    return root;
  }

  _replaceHTML(result, content) {
    content.replaceChildren(result);
  }

  #compendiumSection() {
    const on = this.#compendiumOn;
    return section(
      t('Compendium.Heading'),
      [paragraph(t('Compendium.Intro')), paragraph(t(on ? 'Compendium.StatusOn' : 'Compendium.StatusOff'))],
      on
        ? button('compendiumOff', 'fa-solid fa-rotate-left', t('Compendium.Restore'))
        : button('compendiumOn', 'fa-solid fa-book-open', t('Compendium.Replace')),
    );
  }

  #worldSection() {
    const { counts } = this.#plan;
    const list = document.createElement('ul');
    for (const [key, value] of Object.entries(counts)) {
      const li = document.createElement('li');
      li.textContent = t(`Count.${key}`, { count: value });
      list.append(li);
    }
    return section(
      t('World.Heading'),
      [paragraph(t('Intro')), list],
      button('apply', 'fa-solid fa-paintbrush', t('Apply', { count: counts.update }), counts.update === 0),
      button('revert', 'fa-solid fa-rotate-left', t('Revert', { count: this.#revertCount }), this.#revertCount === 0),
    );
  }

  static async #onCompendiumOn() {
    await this.#switchCompendium(true);
  }

  static async #onCompendiumOff() {
    await this.#switchCompendium(false);
  }

  async #switchCompendium(on) {
    await setCompendiumArt(on);
    ui.notifications.info(t(on ? 'Compendium.Replaced' : 'Compendium.Restored'));
    const reload = await DialogV2.confirm({
      window: { title: 'SARGAS_PF2_IMAGES.Manager.Title' },
      content: `<p>${t('Compendium.Reload')}</p>`,
    });
    if (!reload) return this.render();
    if (foundry.utils.debouncedReload) foundry.utils.debouncedReload();
    else window.location.reload();
  }

  static async #onApply() {
    // Re-plan at click time: tokens may have been placed or art changed since the window rendered.
    const { updates } = await planWorldApply();
    if (!updates.length) return this.render();
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

function section(heading, body, ...buttons) {
  const fieldset = document.createElement('fieldset');
  const legend = document.createElement('legend');
  legend.textContent = heading;
  const footer = document.createElement('footer');
  footer.classList.add('form-footer');
  footer.append(...buttons);
  fieldset.append(legend, ...body, footer);
  return fieldset;
}

function paragraph(text) {
  const p = document.createElement('p');
  p.textContent = text;
  return p;
}

function button(action, icon, label, disabled = false) {
  const el = document.createElement('button');
  el.type = 'button';
  el.dataset.action = action;
  el.disabled = disabled;
  el.innerHTML = `<i class="${icon}"></i>`;
  el.append(` ${label}`);
  return el;
}
