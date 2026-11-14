// Pure art logic shared by the module and the build scripts. No Foundry globals here, so it can be unit tested.

export const MODULE_ID = 'sargas-pf2-creature-images';
export const MODULE_PATH = `modules/${MODULE_ID}`;

/** Images that count as "not chosen by anyone": PF2e's default icons and Foundry's placeholder. */
export function isDefaultImage(src) {
  if (!src) return true;
  return src.startsWith('systems/pf2e/icons/default-icons/') || src === 'icons/svg/mystery-man.svg';
}

/** Art shipped by this module, e.g. the framed official tokens older versions used. Safe to replace. */
export const isModuleArt = (src) => Boolean(src?.startsWith(`${MODULE_PATH}/assets/`));

/**
 * Prototype token data for a portrait: the illustration inside Foundry's dynamic token ring. Demiplane's own
 * token art has a gold frame painted in, so it is not used.
 */
export function tokenFor({ actor }) {
  return { texture: { src: actor }, ring: { enabled: true, subject: { texture: actor } } };
}

/**
 * Plans the update for one world actor. `actor` is plain data: { img, prototypeToken, flags }; `entry` is an
 * art-mapping.json entry: { actor: portrait path, token: tokenFor() data }.
 * Returns null when there is nothing to change. Portrait and token are judged separately: each is only
 * replaced while it still shows a default image or this module's art (from Apply, or from a compendium import).
 */
export function planApply(actor, entry) {
  const ours = actor.flags?.[MODULE_ID]?.applied;
  const tokenData = entry.token;
  const currentToken = actor.prototypeToken?.texture?.src ?? null;
  const replaceable = (src) => isDefaultImage(src) || isModuleArt(src);

  const replacePortrait = actor.img !== entry.actor && (replaceable(actor.img) || actor.img === ours?.img);
  const replaceToken =
    currentToken !== tokenData.texture.src && (replaceable(currentToken) || currentToken === ours?.token);
  if (!replacePortrait && !replaceToken) return null;

  const update = {};
  if (replacePortrait) update.img = entry.actor;
  if (replaceToken) {
    update['prototypeToken.texture.src'] = tokenData.texture.src;
    update['prototypeToken.ring.enabled'] = tokenData.ring.enabled;
    update['prototypeToken.ring.subject.texture'] = tokenData.ring.subject?.texture ?? null;
  }

  // Back up only what Foundry had before our first change, so revert always returns to the original.
  if (!actor.flags?.[MODULE_ID]?.original) {
    update[`flags.${MODULE_ID}.original`] = {
      img: actor.img ?? null,
      token: {
        src: currentToken,
        ringEnabled: actor.prototypeToken?.ring?.enabled ?? false,
        ringSubject: actor.prototypeToken?.ring?.subject?.texture ?? null,
      },
    };
  }
  update[`flags.${MODULE_ID}.applied`] = {
    img: replacePortrait ? entry.actor : (ours?.img ?? null),
    token: replaceToken ? tokenData.texture.src : (ours?.token ?? null),
  };
  return update;
}

/**
 * Plans the revert for one world actor, or null if we never touched it. Anything edited after we applied
 * (it no longer shows our art) is left as it is; the backup flag is removed either way.
 * `deleteFlag` is the update key that removes the module's flags (it differs between Foundry versions).
 */
export function planRevert(actor, deleteFlag) {
  const flags = actor.flags?.[MODULE_ID];
  if (!flags?.original) return null;
  const { original, applied = {} } = flags;
  const update = { ...deleteFlag };
  if (applied.img && actor.img === applied.img) update.img = original.img;
  if (applied.token && actor.prototypeToken?.texture?.src === applied.token) {
    update['prototypeToken.texture.src'] = original.token.src;
    update['prototypeToken.ring.enabled'] = original.token.ringEnabled;
    update['prototypeToken.ring.subject.texture'] = original.token.ringSubject;
  }
  return update;
}
