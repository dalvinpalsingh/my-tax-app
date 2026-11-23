# Roadmap

| Milestone | Scope | Acceptance |
| --- | --- | --- |
| M0A | Documentation and repository preparation | Verify repository and branch, preserve existing work, publish the documentation commit on `dev`, document security controls and leave tax treatment open. |
| M0B | Application foundation | A local React Accounts screen calls the authenticated Worker API backed by local D1 with synthetic records. Establish versioned migrations, quality checks and separate TEST/PROD configuration. Verify Access methods and unauthorized requests in TEST. Production release needs explicit approval. |
| M1 | First usable tracker | Create businesses and accounts, enter MYR/USD income and expenses, record splits, transfers, drawings and opening balances, and reconcile spreadsheet imports. A repeated import creates no extra transactions. Preserve source dates, rates and settlement links for later modules. |
| M2 | Malaysian tax engine and records | After documented validation, produce traceable Borang B working estimates with applicable YA rules, reliefs, payments, donations, expenses and allowances. Validate cross-year cases, household eligibility, and filed-snapshot comparisons. |
| M3 | Complete v1 | Complete invoice and commission workflows, FX and fixed-deposit tracking, tax forecasts and reserves, budgets, evidence, reports and reminders. Verify linked workflows and a TEST restore of data and document contents. |

Use synthetic regression cases for December invoice/January receipt, delayed USD conversion, FD maturity, own-account transfer, owner drawing, subcontractor costs, entertainment, allocation versus paid donations, repeated imports and filed-versus-estimated amounts. Validate the expected accounting and tax results before treating those cases as rule tests. Capture supporting evidence in the review for each milestone.

## Branch protection follow-ups

- [ ] When GitHub Actions reliably reports build, type, lint and test results, require those checks on PRs into `main`.
- [ ] When hosted TEST runs reliably and reports deployments to GitHub, evaluate requiring a successful TEST deployment before merging to `main`.
- [ ] Once production is live, require PRs into `dev`. When a second eligible reviewer is available, require one independent approval on `main` PRs.
- [ ] Consider signed commits once developer and automation signing is configured. Revisit linear history and allowed merge methods once the promotion workflow can preserve ancestry across repeated merges.
- [ ] Revisit tighter branch permissions when there are distinct maintainer and automation roles. Consider merge queues if concurrent PRs routinely contend for merges and CI supports merge groups.
- [ ] Evaluate required security and quality results after scanners report reliably. Revisit file restrictions once the repository plan supports them and required paths, file types and size limits are known.
