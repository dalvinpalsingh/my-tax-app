# My Tax App

A personal tax planning companion for Malaysian sole proprietors who file Borang B.

## Project status

Accounts lets you record and view opening balances in MYR and USD. Businesses lets you record and view your businesses. Planned workflows include tracking income and expenses, recording personal reliefs and historical returns, estimating tax and reserves, and testing what-if scenarios.

## Run locally

With Node.js 24 and pnpm 11 installed, run these commands from the repository root.

```sh
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open the local URL printed by the server. The local D1 fixture contains three synthetic accounts. The local Worker uses Cloudflare's simulated Access identity, and the hosted Worker verifies an Access application JWT. Reloading the fixture preserves existing rows with the same IDs.

Run `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm format:check` before review. Build first to generate the Worker types. Use `pnpm exec cf build --mode test` to check the TEST build.

To keep local D1 outside the checkout, set `MY_TAX_APP_LOCAL_STATE` in the ignored `.env.local` file. Use a quoted directory path if it contains spaces. The dev server, migrations and seed all write below that directory's `v3` subfolder. Without this setting they use `.cloudflare/state/v3`. Restart the dev server after changing paths.

### Hosted setup

TEST and PROD select distinct Worker and D1 names. Provision each environment separately, apply only versioned migrations, and configure an Access policy restricted to the approved Google and email PIN identities. Set `ACCESS_ISSUER`, `ACCESS_AUDIENCE` and `ACCESS_EMAIL` through the Worker secret store. Keep alternate Workers routes and preview URLs disabled. Attach the intended domain only when its Access policy is ready. Verify both login methods and anonymous rejection in TEST. Production deployment requires explicit authorization.

## M0A documentation

- [Requirements](docs/REQUIREMENTS.md), [Architecture](docs/ARCHITECTURE.md) and [Data model](docs/DATA_MODEL.md)
- [Tax rules and validation](docs/TAX_RULES.md) and [Import specification](docs/IMPORT_SPEC.md)
- [Decisions](docs/DECISIONS.md), [Roadmap](docs/ROADMAP.md) and [Security](docs/SECURITY.md)
- [Contributor instructions](AGENTS.md)

M0A prepares the repository for implementation. Accounting, FX, fixed-deposit and Malaysian tax treatments are pending validation.

## Contributing and generative AI

- **AI-assisted contributions are welcome.** You are responsible for every change you submit. Review the entire diff by hand, verify generated code and dependencies, and make sure you can explain the change. Mention material AI assistance in the pull request.
- **Verify your work.** Run the relevant tests, lint checks, and build before requesting review. Record what you ran and the results in the pull request. When automated checks are unavailable, describe your manual verification.
- **Develop on `dev` until production is live.** Check changes locally and push focused commits to `dev`. Promote by merging `dev` into `test` locally and pushing `test`. For `main`, open a PR, record verification, resolve review conversations and merge manually. Mandatory approvals are set to zero while working solo. Force pushes and branch deletion are blocked on `dev`, `test` and `main`. See the [roadmap](docs/ROADMAP.md#branch-protection-follow-ups) for deferred rules.
- **Use GitHub Issues.** Search existing issues first. For bugs, include steps to reproduce, expected and actual behaviour, the affected version or environment, and sanitised logs or screenshots where helpful. For feature requests, describe the problem and the proposed outcome.
- **Protect sensitive information.** Keep credentials, personal data, and confidential material out of commits, issues, pull requests, and AI prompts. Report suspected security vulnerabilities privately to the maintainer.
