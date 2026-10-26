# sargas-pf2-creature-images — Plan

Goal: a Foundry VTT v14 module for the PF2e system that ships Demiplane Nexus creature art as local files and applies it
to matching creatures in one click. Demiplane is never contacted at runtime.

## Decisions (from review)

| Topic            | Decision                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------- |
| Demiplane access | No account; public pages only                                                               |
| Use              | Personal use only                                                                           |
| Hosting          | Private Foundry server; images live inside the module folder                                |
| Scope            | Only creatures that have art on Demiplane; never touch tokens already placed on scenes      |
| Art targets      | Portrait **and** prototype token, using Foundry's dynamic token ring                        |
| Overwrite policy | Replace only default/system placeholder images                                              |
| Variants         | Remaster art wins over legacy/PFS                                                           |
| Image collection | Done once by the maintainer at build time and bundled in the module; no end-user downloader |
| GitHub           | Issues, milestones and labels in `sargas79/sargas-pf2-creature-images`                      |

**Constraint: the repo is public.** Bundled images are listed in `.gitignore` and are never pushed. The module is built locally and
copied to the private server's `Data/modules/`. No GitHub release zips contain art. Only data files (slugs, names, the match table) are committed.

## Architecture

```
scripts/ (maintainer, Node)                      module/ (Foundry v14, pf2e)
 crawl-index ─► creatures.json                    module.json (compendiumArtMappings flag)
 download    ─► module/assets/creatures/*.webp    art-mapping.json ◄── match
 match (vs pf2e pack data) ─► art-mapping.json    "Apply to world creatures" + revert
                              match-report.md     no network access
```

- **New imports:** a `compendiumArtMappings` entry in `module.json` points PF2e compendium actors to the local portrait, plus a token
  with `ring.enabled` and the subject texture. Creatures dragged from compendia get the art automatically, and the system packs stay unmodified.
- **Existing world actors:** an "Apply" button updates sidebar actors whose `img`/token are still a default image, and their
  prototype tokens. It never updates placed TokenDocuments, so scenes are left exactly as they are.

## Issues

| #   | Milestone           | Title                                                                | Labels            |
| --- | ------------------- | -------------------------------------------------------------------- | ----------------- |
| 1   | M0 Research         | Spike: Demiplane creature data and image access                      | research, scraper |
| 2   | M1 Image collection | Repo scaffold and git hygiene for bundled art                        | infra             |
| 3   | M1 Image collection | Script: crawl Demiplane creature index                               | scraper           |
| 4   | M1 Image collection | Script: download and optimize creature images                        | scraper           |
| 5   | M2 Module core      | Module scaffold for Foundry v14 + PF2e                               | module            |
| 6   | M2 Module core      | Matcher: Demiplane creatures → PF2e compendium actors                | matching          |
| 7   | M2 Module core      | Compendium art mapping with dynamic token ring                       | module            |
| 8   | M2 Module core      | "Apply to world creatures" action (default images only, skip scenes) | module            |
| 9   | M2 Module core      | Backup and revert of original images                                 | module            |
| 10  | M3 Polish           | Match report and manual overrides                                    | matching          |
| 11  | M4 Release          | README, install-to-server instructions and legal notice              | documentation     |
| 12  | M4 Release          | Tests for matcher and apply/revert                                   | tests             |

Full issue text is in the GitHub issues.
