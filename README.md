# Sargas PF2e Creature Images

A Foundry VTT v14 module for the Pathfinder Second Edition system. It replaces default creature portraits and tokens
with the creature art shown on [Demiplane Nexus](https://app.demiplane.com/nexus/pathfinder2e/creatures). The art is
downloaded once by the maintainer and shipped inside the module folder, so Foundry never contacts Demiplane.

> **Personal use only. This repository contains no art.** The images are copyrighted by Paizo Inc. They are
> downloaded to your own machine, kept out of git (`.gitignore` and a pre-commit hook enforce this), and copied
> straight to your private Foundry server. Do not publish the built module or its `assets/` folder.

## What it does

- **Creatures from PF2e compendia** get the art automatically when you add them to a world. This uses Foundry's
  compendium art mapping (`module/art-mapping.json`); the PF2e system packs themselves are never modified.
- **Creatures already in your world** can be updated from **Module settings → Manage creature art** (GM only):
  - The window previews what will change before you apply anything.
  - A portrait or token is replaced only while it still shows a default PF2e/Foundry image. Your own art is kept.
  - Creatures with a token on any scene are skipped, and tokens already placed on scenes are never changed.
  - **Revert all** restores the original images, except ones you changed yourself after applying.
- **Tokens**: Demiplane's official token art is used as-is (it already has a painted frame). Creatures without
  official token art show their portrait inside Foundry's dynamic token ring.
- **Remaster first**: when a creature has both a remaster and a legacy version on Demiplane, the remaster art wins.

Coverage with PF2e 8.6.1: 4,276 of 6,442 compendium NPCs get art. The rest have no art on Demiplane, or no
confident match. See [`scripts/data/match-report.md`](scripts/data/match-report.md).

## Requirements

- Foundry VTT v14 with the PF2e system 8.6.0 or newer.
- To build: Node.js 20+ and git. The crawl uses Playwright's Chromium (`npx playwright install chromium`).
- About 1 GB of disk space for the art.

## Building the module

```bash
npm install
npx playwright install chromium
npm run crawl       # creature index from Demiplane -> scripts/data/creatures.json (~10 min)
npm run download    # art -> module/assets/creatures/ (~3-4 h, resumable)
npm run fetch:pf2e  # PF2e NPC index for the pinned PF2e version -> scripts/data/pf2e-npcs.json
npm run match       # Demiplane <-> PF2e matches -> scripts/data/matches.json + match-report.md
npm run mapping     # Foundry compendium art mapping -> module/art-mapping.json
npm run build       # ready-to-install module -> dist/sargas-pf2-creature-images/
```

Every step can be re-run. The crawl caches Demiplane's responses in `scripts/.cache/`, and the download skips
images it already has, so a re-run only fetches what is new.

Both network steps are deliberately slow (about one request every 4 s for the crawl and 1.5 s for the download).
They stop as soon as Demiplane refuses a request, and never try to get around it. If that happens, wait and re-run
later; progress is kept.

## Installing on your Foundry server

1. Copy `dist/sargas-pf2-creature-images/` into the server's `Data/modules/` folder (for example with `scp -r` or
   `rsync`).
2. Restart Foundry, open your PF2e world, and enable **Sargas PF2e Creature Images** under Manage Modules.
3. Optional: open **Module settings → Manage creature art** to update creatures already in the world.
4. If other modules also provide PF2e creature art (such as Paizo's premium bestiary modules), choose which one wins
   in Foundry's **Compendium Art** settings.

To update, rebuild and replace the folder on the server.

## Fixing a wrong or missing match

Edit [`scripts/data/overrides.json`](scripts/data/overrides.json), then run `npm run match`, `npm run mapping` and
`npm run build`:

```json
{
  "pin": {
    "Compendium.pf2e.pathfinder-bestiary.Actor.<id>": "adult-blue-dragon"
  },
  "exclude": ["Compendium.pf2e.hells-destiny-bestiary.Actor.<id>"]
}
```

- `pin` maps a PF2e NPC's UUID to a Demiplane creature slug (the last part of its Demiplane URL). Pinned matches are
  always applied, for example to give an ancient dragon its adult's art.
- `exclude` stops an NPC from getting any art.

UUIDs are listed in the match report. In Foundry, a compendium entry's UUID can be copied from its sheet header.
Low-confidence matches are never applied unless you pin them.

## Updating for a new PF2e version

Change `PF2E_TAG` in [`scripts/lib/pf2e.mjs`](scripts/lib/pf2e.mjs) and the minimum `pf2e` version in
[`module/module.json`](module/module.json). Then run `npm run fetch:pf2e`, `match`, `mapping` and `build`, and review
the report.

## Development

```bash
npm test        # unit tests, including apply/revert against simulated Foundry globals
npm run lint
npm run format
```

[`docs/TESTING.md`](docs/TESTING.md) is the checklist for testing in a real Foundry world.

## Legal

This is an unofficial fan project for personal use. It is not affiliated with, endorsed by, or sponsored by Paizo
Inc., Demiplane, or Roll20.

- Creature art and Pathfinder content are © Paizo Inc. PAIZO, PATHFINDER and related marks are trademarks of Paizo
  Inc. No art is distributed by this repository.
- Demiplane is a trademark of Roll20, LLC. Automated access to Demiplane may conflict with its Terms of Service;
  anyone running the build scripts is responsible for their own use.
- The code in this repository is MIT licensed (see [LICENSE](LICENSE)). PF2e system data comes from the
  [foundryvtt/pf2e](https://github.com/foundryvtt/pf2e) project under its own license.
