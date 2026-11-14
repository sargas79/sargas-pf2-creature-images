# Testing

## Automated (`npm test`, runs in CI)

| File                      | Covers                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `test/demiplane.test.mjs` | Listing request building, hit normalization, placeholder thumbnails, CDN URLs                                 |
| `test/match.test.mjs`     | Name/source normalization, dragon names, remaster priority, PFS and Weak/Elite variants, ambiguity, overrides |
| `test/art.test.mjs`       | Default-image detection, tokens always use the portrait in the ring, apply/revert rules and backups           |
| `test/world.test.mjs`     | `module/scripts/world.mjs` against simulated Foundry globals: scene skip, name fallback, apply then revert    |

CI also checks that no creature art is tracked (`npm run check:art -- --all`), plus lint and formatting. No art is
needed to run any of it.

## In a real Foundry world

The automated tests simulate Foundry, so run through this once per Foundry or PF2e update. Use a throwaway world
running Foundry v14 and PF2e ≥ 8.6.0, with only this module enabled at first.

### Setup

- [ ] Copy `dist/sargas-pf2-creature-images/` into `Data/modules/`, restart, and enable the module.
- [ ] The browser console (F12) shows no errors from `sargas-pf2-creature-images` on load.

### Compendium art (#7)

- [ ] Right after enabling the module, compendium creatures still show the default PF2e icons.
- [ ] **Manage creature art → Replace compendium images**, then reload. **Configure Settings → Core → Compendium
      Art** shows this module with portraits and tokens on.
- [ ] Open the Monster Core compendium. Mapped creatures show their Demiplane portrait in the list.
- [ ] Drag **Abrikandilu** into the world by its name. The portrait is the Demiplane illustration, and the token
      shows that illustration inside the dynamic ring, with no painted gold frame.
- [ ] A world NPC imported with the framed token from v0.2.x shows up under "Will get art"; Apply switches its
      token to the ring (unless it has a token on a scene).
- [ ] A creature listed as `low` or unmatched in `scripts/data/match-report.md` keeps the default PF2e icon.

- [ ] **Restore default compendium images**, then reload: compendium creatures show the default icons again.
- [ ] Reloading or restarting the world does not switch the art back off once it is on.

### Apply (#8)

Before opening the window, prepare these world NPCs:

1. Two NPCs imported from a compendium **before** enabling the module (default images).
2. One NPC with a custom portrait you set yourself and a default token.
3. One NPC with a token placed on a scene.
4. One NPC whose compendium link is gone: create an NPC by hand with the same name and level as a mapped creature.

- [ ] **Module settings → Manage creature art** opens. The counts match: 1, 2 and 4 under "will get art", 3 under
      "on a scene", and 2's custom portrait is kept.
- [ ] Apply asks for confirmation, shows progress, then reports the number updated.
- [ ] 1 and 4 have the new portrait and token. 2 keeps its portrait and gets the token. 3 and its placed token are
      unchanged.
- [ ] Re-opening the window shows nothing left to update.

### Revert (#9)

- [ ] After applying, change one updated NPC's portrait by hand.
- [ ] **Revert all** restores the original images on the others, and keeps the portrait you just changed.
- [ ] The reverted actors no longer have `flags.sargas-pf2-creature-images` (check with
      `game.actors.getName('<name>').flags` in the console). This exercises the v14 deletion syntax.
- [ ] Apply works again after reverting.

### With other art modules

- [ ] With a Paizo premium bestiary module also enabled, **Compendium Art** settings list both modules, and changing
      their priority changes which art imported creatures get.
