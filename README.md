# Sargas PF2e Creature Images

A Foundry VTT v14 module for the Pathfinder Second Edition system. It replaces the default creature portraits and
tokens in the PF2e compendiums with official creature art, with one button.

> **Personal use only.** The creature art is copyrighted by Paizo Inc. Keep this repository and its releases
> private, and don't share the module.

## Features

- **One-click compendium images.** A single button replaces the default images of about 4,300 PF2e compendium
  creatures. Creatures you add to a world from a compendium then arrive with the new portrait and token.
- **Safe for the PF2e system.** The PF2e compendiums themselves are never modified, so system updates don't undo
  anything, and a second button restores the default images.
- **Tokens:** official token art is used where it exists. Other creatures show their portrait inside Foundry's
  dynamic token ring.
- **Remastered art first.** When a creature has both a remastered and a legacy version, the remastered art is used.
- **Creatures already in your world** can be updated too:
  - Only portraits and tokens that still show a default image are replaced; your own art is kept.
  - Creatures with a token on any scene are skipped, and tokens already placed on scenes never change.
  - **Revert all** restores the original images.
- **Works offline.** All images are included in the module.

## Requirements

- Foundry VTT v14
- Pathfinder Second Edition (PF2e) system 8.6.0 or newer
- About 1 GB of free space on the Foundry server

## Installation

The module is installed from the [Releases](https://github.com/sargas79/sargas-pf2-creature-images/releases) page.

**Manual install (works with a private repository):**

1. Sign in to GitHub and download `sargas-pf2-creature-images.zip` from the latest release.
2. Extract it into a new folder `Data/modules/sargas-pf2-creature-images` on your Foundry server.
3. Restart Foundry.

**Manifest URL:** in Foundry, choose **Add-on Modules → Install Module** and paste:

```
https://github.com/sargas79/sargas-pf2-creature-images/releases/latest/download/module.json
```

This only works while the repository is public, because Foundry can't sign in to GitHub. Updates offered through
this URL have the same limit.

## Usage

1. Open your PF2e world and enable **Sargas PF2e Creature Images** in **Manage Modules**.
2. Go to **Game Settings → Configure Settings → Sargas PF2e Creature Images** and click **Manage creature art**
   (GM only).
3. Under **Compendium**, click **Replace compendium images**, then reload when asked. Other connected players should
   reload too.
4. Optional: under **Creatures in this world**, check the counts and click **Apply** to update creatures already in
   the world.

To undo, use **Restore default compendium images** and **Revert all** in the same window.

The compendium images are off when the module is first enabled, so nothing changes until you press the button.

### Using it with other art modules

If another module also provides PF2e creature art (for example Paizo's premium bestiary modules), choose which one
wins in **Configure Settings → Core → Compendium Art**. That screen also shows this module's on/off state.

## Troubleshooting

- **The button doesn't seem to change anything:** reload the page (F5) after pressing it, and check that no other
  art module has a higher priority under **Compendium Art**.
- **A creature has the wrong art:** please open an issue with the creature's name and compendium.
- **A creature keeps the default icon:** not every creature has art; about two thirds of the PF2e compendium
  creatures are covered.

## Legal

This is an unofficial fan project for personal use. It is not affiliated with, endorsed by, or sponsored by Paizo Inc.

- Creature art and Pathfinder content are © Paizo Inc. PAIZO, PATHFINDER and related marks are trademarks of Paizo
  Inc. The art is included for personal use only and must not be redistributed.
- The code in this repository is MIT licensed (see [LICENSE](LICENSE)).
