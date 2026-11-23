# Security

## Access

Use Cloudflare Access with Google and email one-time PIN restricted to approved identities. Map both methods to the same authorized internal user. Validate Access identity and authorization on every protected API and document request. Fail closed on missing or invalid identity. Restrict alternate routes and previews. Keep the local-only identity mechanism outside hosted environments.

## Secrets and sensitive records

Store local secrets in ignored environment files and hosted secrets in provider-managed secret storage. Store CI deployment credentials in restricted GitHub Actions secrets if CI needs them. Scope access to the task and environment. Keep tokens, passwords, OAuth credentials, real identifiers, financial data, receipt contents and actual backups out of Git, chat prompts, fixtures, PRs and logs. Use synthetic test records. Use sanitized error categories and opaque correlation IDs in operational logs. Keep financial audit details within protected storage.

Keep D1, R2 and linked Drive documents private. Serve files through authorized access. Keep financial data out of public previews, caches and notification emails. Review staged changes and add automated secret and sensitive-file checks before application delivery. Ignore rules protect untracked files. Treat any previously committed secret as exposed.

## Backups and retention

Keep independent encrypted backups of database records, metadata and actual attachment contents, including a plan for evidence stored in Drive. Restrict restore access and store encryption keys separately. Test recovery in an isolated environment and verify file integrity, record counts and document links. Design for at least seven years of relevant tax records, with longer retention when required. Validate the applicable retention start, exceptions and disposal policy before automating deletion.

## Deployments and incidents

Use reviewed PRs, automated checks, separate TEST and PROD data and credentials, and explicit approval before production deployments. Use synthetic data in TEST. Check target environment and migration readiness before release and document recovery procedures. Report vulnerabilities privately to the maintainer as described in the README. For an exposure, revoke or rotate affected credentials, contain the access path, assess affected records, and coordinate cleanup and recovery privately.
