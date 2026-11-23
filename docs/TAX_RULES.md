# Tax rules and validation

**Status: pending validation.** This specification defines what to record and review. Malaysian tax treatments, accounting recognition and FX measurement remain open. No rates, thresholds, exemptions or filing eligibility have been approved for implementation.

| Pending area | Evidence and worked cases to validate |
| --- | --- |
| Contracting and commissions | Identify the service/debt, invoice, statement and payment events. Confirm recognition and YA across December/January, advances, part payments, credits and commission clawbacks. Review the relevant Income Tax Act provisions, including section 24 where applicable. |
| Foreign exchange | Validate rate source, valuation dates, measurement, realised and unrealised differences, and revenue versus capital treatment for settlement into a foreign-currency account, subsequent holding and eventual conversion. Review HASiL Public Ruling 12/2019 and applicable updates. |
| Fixed deposits | Validate interest treatment by owner, institution, product, residency, use and YA. Review FX on business funds versus personal investment. Test placements, renewals, maturity and fees with principal and interest separately observable. |
| Business deductions | Validate entertainment, mixed use, asset and capital allowances, family wages, subcontractor costs, fees, losses and carry-forwards, including evidence and allocation limits. |
| Personal and family tax | Validate residency, assessment eligibility, claimant rules, relief caps, rebates, credits and payments by YA. Test joint versus separate assessments and duplicate relief claims. |
| Donations and compliance | Review actual paid amounts, qualifying recipients, approvals, receipts and applicable limits. Confirm filing form, deadlines, retention and e-Invoice obligations before implementing compliance logic. |

Independent bookkeeping invariants include linking both sides of an own-account transfer, recording owner drawings separately from salary, tracking FD principal separately from interest, and distinguishing giving allocations from actual donations. Capture evidence for mixed-use costs and keep user review distinct from professional or authority validation.

For each rule, record its jurisdiction, YA and effective dates, primary authority, assumptions, worked examples and review outcome. Require documented validation before enabling filing-reliant results. Label provisional estimates, expose input and rule versions, show included or excluded unreviewed items, and retain reasons and dates for overrides. Use synthetic regression cases and preserve filed snapshots as estimates evolve.
