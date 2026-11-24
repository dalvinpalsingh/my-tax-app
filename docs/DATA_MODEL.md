# Data model

This is a logical model for incremental migrations. Preserve stable record IDs, creation and revision metadata, and explicit links between events and evidence.

| Records | Relationships and required facts |
| --- | --- |
| Taxpayers, businesses and activities | Taxpayer owns registrations and activities over effective dates. Preserve ownership when activities move, close or incorporate. Spouse and dependant facts are YA-specific. |
| Accounts and purposes | Account belongs to an owner, has a currency and may have multiple dated purposes. Record opening balance and as-of date. Keep account purpose independent of expense and tax classification. |
| Transactions, splits and transfers | Record account, effective and posting dates, original amount, currency, optional MYR book value, category, counterparty, source and reconciliation state. Link transfer legs and classify drawings separately. Splits allocate a single underlying amount. |
| Invoices and settlements | Preserve issue, service/debt and due dates, line items, currency and revision history. Allocations connect payments to invoices and support partial or multiple settlements. Keep credits and correspondence linked. |
| FX and fixed deposits | Link conversion legs and fees. Store valuation date, rate source and direction, actual bank rate, MYR proceeds and book values separately. Record holding purpose and dated changes. Deposit lifecycles link placements, principal returns, interest, renewals and maturities. |
| Commissions and adjustments | Preserve statement period and line references, gross and net values, fees and clawbacks. Reconcile to bank receipts independently of recognition. |
| Expenses, assets and evidence | Store business-use splits, allocations across activities, purpose, asset history and receipt links. Documents store private object references or Drive links, provenance and metadata. |
| Imports and reconciliation | Batches own rows and mapping versions. Rows retain source references, parse diagnostics, duplicate candidates, and links to matches or created transactions. |
| Tax and filing | Version rules and calculations by YA. Link evidence, classification and review status, overrides, relief claims, payments and credits to calculations. Store filed returns and amendments as separate immutable snapshots with diffs against estimates. |
| Planning and audit | Track budget categories, goals, reserve allocations, scenarios, reminders, audit events and correction chains separately from posted financial movements. |

Use integer minor units for money, precise decimal strings for exchange rates, and ISO dates with Malaysia's calendar applied to business and tax dates. Make rounding and valuation policy explicit when validated. Preserve both original amounts and derived values. Record the actor, timestamp, reason and affected record for imports, edits, overrides, reversals and recalculations. Use linked corrections for reconciled or locked entries.

M1 activities have a stable ID, name, start date, optional current Business link and archive timestamp. Archiving a business preserves existing links, and activity archiving works independently. The first manual transaction form will assign activities by stable ID. Record dated Business link changes before using those links to derive historical transaction reporting.
