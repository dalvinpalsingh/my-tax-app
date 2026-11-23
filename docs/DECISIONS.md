# Planning decisions

Product scope comes from Rounds 1–5 and the approved Cloudflare development blueprint. Round 6 confirms the implementation defaults with the explicit security amendment. This log records decisions in a form suitable for the public repository.

| ID | Approved decision |
| --- | --- |
| R1–R5 | Individual Malaysian tax, sole-proprietor activities, shared financial records, evidence, historical returns, household scenarios, complete budgeting, reserve planning and detailed reporting are in complete v1. Deliver usable increments. |
| Architecture | React and TypeScript through an authenticated Worker REST API to D1, with Cloudflare Free and separate hosted TEST and PROD environments. Google and email PIN sign-in through Access, with approved identities only. |
| R6-01 | Preserve invoice, settlement, FX and deposit events and maintain cash-flow, accounting and tax views. Financial and tax treatments remain pending. |
| R6-02–04 | Lightweight ledger and reconciliation, one taxpayer with multiple activities, effective-dated purposes, and separate original currency amounts, MYR values, rate sources, proceeds and fees. |
| R6-05–06 | Start with YA 2024 onward, allow earlier years with validated rules, version rules by YA and support explained review and overrides. |
| R6-07–10 | Manual and CSV/XLSX import with preview and reconciliation, R2 uploads and Drive links, in-app and email reminders, and an online-first installable PWA. |
| R6-11–12 | Audit corrections, reverse locked or reconciled entries through linked records, and preserve filed snapshots alongside independent estimates. |
| R6-13 | Keep the repository public. Document access, secrets, backups, sensitive data, release permissions and incident response. Use private secret stores, synthetic fixtures and sanitized logs. Require explicit production authorization. |

## Open items and M0A design details

- Validate recognition, FX, fixed deposits, deductions and other Malaysian tax treatment under [Tax rules](TAX_RULES.md). Import mappings, acceptable input bounds and layout variations need synthetic examples and sample formats before implementation.
- The logical relationships, import lifecycle and milestone acceptance criteria in this pack translate approved scope into proposed implementation details. Confirm these while designing migrations and workflows.
- Confirm the exact tooling and Free-plan fit at M0B. Defer full Drive sync, OCR, direct bank access, MyInvois integration, payroll compliance and corporate or partnership tax computation.
