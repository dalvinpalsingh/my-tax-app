# My Tax App progress

Update this checklist after each task and summarize the current status in the handoff. Use the [roadmap](ROADMAP.md) for milestone scope.

## Completed

- [x] M0A repository documentation and branch protections.
- [x] Local M0B foundation with a React frontend, authenticated Worker API and D1 migrations.
- [x] Create and view MYR and USD accounts with opening balances.
- [x] Create and view businesses with an optional registration reference.
- [x] Allow a dedicated local D1 folder shared by the dev server, migration and seed commands.
- [x] Add Home, responsive navigation and a single local test URL on port 5173.
- [x] Edit, archive and restore accounts with compact actions, aligned cards and All, Active and Archived views.

- [x] Share record filters, account options, display defaults, validation limits and local simulator settings. Add edit, archive and restore to Businesses.
  - Verified the filters, reloads, archive and restore, and account form defaults in Chrome using local fixtures. Ran the local D1 migration and seed and checked the build, types, lint, tests and formatting.
  - Aligned the Businesses cards using the Accounts grid. Verified wrapped registration references, desktop and narrow layouts, and archive confirmation in Chrome.
  - Verified editing, clearing a registration reference, reload persistence, cancel, and archive and restore in Chrome using a synthetic business. Added API checks for partial updates, validation, authorization, and editing an archived business.
  - Stabilized Refresh, card sizing, and page alignment across filters. Verified slow and cached loads, errors, keyboard focus, URL reloads, and desktop and mobile sizing with zero, one, and several results in Chrome. Exercised create, edit, archive and restore with synthetic responses.

- [x] Standardize page titles and descriptions outside Home. Verified matching layouts in Chrome at desktop, tablet and mobile widths and confirmed the shared header works with optional controls.

- [x] Use one cached All list with in-memory status filters on Accounts, Businesses and Activities. The Business picker shares the Businesses cache. Verified request counts, linked status updates and failed writes in Chrome with synthetic responses. Checked direct links and reloads against the local app.
- [x] Share the 192 px icon between the browser tab and app manifest with a one-year browser cache. Change the shared URL when replacing the image so browsers fetch the new version.
- [x] Add the Activities page with optional Business links and create, edit, archive and restore actions. Verified the local D1 migration, API behavior and the Chrome workflow with synthetic data.

## Ongoing

No tasks in progress.

## Pending

- [ ] Manual income and expense entry with activity assignment by stable activity ID, followed by splits, transfers and drawings.
- [ ] Add dated Business links before transaction reporting depends on activity-to-business history.
- [ ] Calculate monthly account opening balances, net movements and closing balances after manual transactions and transfers and before statement reconciliation.
- [ ] CSV/XLSX imports and reconciliation.
- [ ] Hosted TEST and live Access verification, then explicitly approved PROD setup.
- [ ] Private R2 attachment storage.
- [ ] Validate accounting, FX, fixed-deposit treatment and Malaysian tax rules before relying on filing estimates.

### Settings and accessibility wishlist

- [ ] Add a Settings page for user preferences.
- [ ] Offer system, light and dark appearance modes.
- [ ] Offer selectable colour schemes with accessible contrast.
- [ ] Move theme colours and typography into CSS variables as part of Settings.
- [ ] Add font-size controls and colour-vision-friendly palettes. Keep status indicators understandable through text or icons as well as colour.
