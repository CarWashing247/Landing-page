# Documentation

Operational documentation. The *rules* for working in this repo are in
[`AGENT.md`](../AGENT.md) and [`CLAUDE.md`](../CLAUDE.md); the *architecture
and task plan* are in [`architecture/`](../architecture/). This folder is for
procedures a person follows.

| Document | For whom | What it covers |
| --- | --- | --- |
| [deployment.md](./deployment.md) | developer / operator | Deploying from nothing to a live site, step by step |

Planned, and written by the task that needs them:

| Document | Task | What it will cover |
| --- | --- | --- |
| `runbook-backup-restore.md` | T-22 | Postgres backup schedule and the restore procedure, actually performed |
| `huong-dan-bien-tap.md` | T-24 | Vietnamese guide for editors: publish, preview, rollback, SEO fields, locales |
| `gbp-sync-checklist.md` | T-24 | Keeping Google Business Profile byte-identical to `BusinessInfo` |
| `developer-notes.md` | T-24 | Short English orientation for the next developer, mostly links |

## Conventions

- Anything an editor reads is Vietnamese. Anything a developer reads is
  English (`AGENT.md` section 1).
- A document that tells someone to run a command shows the command, and the
  output that means it worked.
- If a document and the code disagree, the code wins and the document is a
  bug. Fix it in the same commit that changed the behaviour.
