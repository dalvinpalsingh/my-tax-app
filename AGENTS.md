# Working on My Tax App

- Start with the [README](README.md) and read the specification relevant to your change. Use [Decisions](docs/DECISIONS.md) to distinguish approved scope from open questions.
- Follow the README contribution policy. Work directly on `dev` until production is live, promote by merging locally into `test`, and use a manually merged pull request for `main`. Production deployment requires explicit authorization.
- Use synthetic fixtures. Keep credentials, real financial records, and private identifiers out of Git, logs, tests, issues, pull requests, and AI prompts. See [Security](docs/SECURITY.md).
- Preserve source events, audit history and filed returns. Keep accounting, FX, fixed-deposit and Malaysian tax treatments pending until validated under [Tax rules](docs/TAX_RULES.md).
- When adding screens that manage records, cover create, view, edit and removal. Use archive and restore when records need to be retained. Record any deferred actions in [Progress](docs/PROGRESS.md).
- For browser checks, reuse an existing local app tab when available. Open one only if needed and leave the app tab open for the user's review.
- Keep changes focused and record the checks you ran. Update [Progress](docs/PROGRESS.md) after each task and include a short status checklist in the handoff. [Roadmap](docs/ROADMAP.md) defines milestone boundaries.
- Leave changes uncommitted for the user to verify. Commit and push to `dev` only after the user approves the changes.
