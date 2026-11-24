# Roadmap

| Milestone | Scope | Acceptance |
| --- | --- | --- |
| M0A | Documentation and repository preparation | Verify repository and branch, preserve existing work, publish the documentation commit on `dev`, document security controls and leave tax treatment open. |
| M0B | Application foundation | A local React Accounts screen calls the authenticated Worker API backed by local D1 with synthetic records. Establish versioned migrations, quality checks and separate TEST/PROD configuration. Verify Access methods and unauthorized requests in TEST. Production release needs explicit approval. |
| M1 | First usable tracker | Create businesses and accounts, enter MYR/USD income and expenses, record splits, transfers, drawings and opening balances, and reconcile spreadsheet imports. A repeated import creates no extra transactions. Preserve source dates, rates and settlement links for later modules. |
| M2 | Malaysian tax engine and records | After documented validation, produce traceable Borang B working estimates with applicable YA rules, reliefs, payments, donations, expenses and allowances. Validate cross-year cases, household eligibility, and filed-snapshot comparisons. |
| M3 | Complete v1 | Complete invoice and commission workflows, FX and fixed-deposit tracking, tax forecasts and reserves, budgets, evidence, reports and reminders. Verify linked workflows and a TEST restore of data and document contents. |

Use synthetic regression cases for December invoice/January receipt, delayed USD conversion, FD maturity, own-account transfer, owner drawing, subcontractor costs, entertainment, allocation versus paid donations, repeated imports and filed-versus-estimated amounts. Validate the expected accounting and tax results before treating those cases as rule tests. Capture supporting evidence in the review for each milestone.

### Monthly account balances in M1

After manual transactions and transfers are available, show each account's calculated monthly opening balance, net movement and closing balance in its own currency. Derive them from the dated starting balance and recorded movements. Carry the closing balance into the next month, including months without activity. Mark periods before recorded history as unavailable and indicate partial history where applicable. Define the opening-date cutoff when designing the ledger, before implementing the calculation.

Build this view before statement reconciliation. During reconciliation, compare calculated balances with the balances reported by the bank and show differences for review.

## Branch protection follow-ups

- [ ] When GitHub Actions reliably reports build, type, lint and test results, require those checks on PRs into `main`.
- [ ] When hosted TEST runs reliably and reports deployments to GitHub, evaluate requiring a successful TEST deployment before merging to `main`.
- [ ] Once production is live, require PRs into `dev`. When a second eligible reviewer is available, require one independent approval on `main` PRs.
- [ ] Consider signed commits once developer and automation signing is configured. Revisit linear history and allowed merge methods once the promotion workflow can preserve ancestry across repeated merges.
- [ ] Revisit tighter branch permissions when there are distinct maintainer and automation roles. Consider merge queues if concurrent PRs routinely contend for merges and CI supports merge groups.
- [ ] Evaluate required security and quality results after scanners report reliably. Revisit file restrictions once the repository plan supports them and required paths, file types and size limits are known.
