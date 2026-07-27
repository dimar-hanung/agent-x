# Issue tracker: Local Markdown

Issues and specs for this repo live as Markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`
- Triage state is recorded as a `Status:` line near the top of each issue file
- Comments append under a `## Comments` heading

## Publish to the issue tracker

Create a new file under `.scratch/<feature-slug>/`, creating the directory if needed.

## Fetch a ticket

Read the referenced file. The user will normally pass the path or issue number directly.

## Wayfinding operations

- Map: `.scratch/<effort>/map.md`
- Child ticket: `.scratch/<effort>/issues/NN-<slug>.md`
- Blocking: a `Blocked by: NN, NN` line; a ticket is unblocked when every listed file is resolved
- Frontier: first open, unblocked, unclaimed issue number wins
- Claim: set `Status: claimed` before work
- Resolve: append `## Answer`, set `Status: resolved`, and add the decision pointer to the map
