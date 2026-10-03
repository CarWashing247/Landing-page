# T-24 · Handover

| | |
| --- | --- |
| Phase | 4 — Launch |
| Branch | `t-24-handover` |
| Depends on | T-12, T-23 |
| Blocks | Gate 4 |
| Critical path | no |

## Goal

A non-technical person publishes a content change end to end, without a
developer. The deliverable is not the document — it is that outcome, with
the document as the means.

## Scope

**In scope**

- A short **Vietnamese** guide for editors covering:
  - the publish flow: draft → preview → publish, and roughly how long
    before the change is live (~10s, no deploy);
  - preview: where the Preview button is and why a logged-out visitor
    cannot see a draft;
  - rollback: the Versions tab, and that it is safe;
  - **what each SEO field does**, in plain language — the six fields from
    Design.md section 2.3, including why `canonical` is normally left
    blank and what `noindex` actually does;
  - why a published slug is locked.
- A checklist for keeping **Google Business Profile in sync with
  `BusinessInfo`**: which fields must match byte-for-byte (name, address,
  phone), and what to do when one changes.
- A short English note for the next developer: where the non-obvious
  decisions live (`metadataBase`, cache tags, the webhook) — pointing at
  `AGENT.md` and `Design.md` rather than restating them.

**Out of scope**

- Restating `AGENT.md` or `Design.md`. Link, do not duplicate; a second
  copy of a rule is a rule that will drift.
- Training videos or screenshots of a UI that is still changing — unless
  they are cheap to regenerate, say which.

## Steps

1. Write the editor guide in Vietnamese, in `docs/huong-dan-bien-tap.md`.
   Keep it short: an editor who needs ten pages will read none.
2. Write the Google Business Profile sync checklist, naming the exact
   `BusinessInfo` fields and their GBP counterparts.
3. Write the developer note, linking to `AGENT.md` and `Design.md`.
4. **Run the real test:** sit a non-technical person in front of `/admin`
   and have them make and publish a content change using only the guide.
   Record where they hesitated.
5. Fix the guide at every point they hesitated. That edit is the actual
   work of this task.

## Files

```
docs/huong-dan-bien-tap.md      # Vietnamese, for editors
docs/gbp-sync-checklist.md      # Vietnamese
docs/developer-notes.md         # English, short, mostly links
```

## Acceptance criteria

Inherits AGENT.md section 8. In addition:

- [ ] **A non-technical person publishes a content change end to end
      without developer help** — observed, not assumed.
- [ ] The guide is in Vietnamese and covers publish, preview, rollback and
      all six SEO fields.
- [ ] The GBP checklist names the exact `BusinessInfo` fields that must
      match Google Business Profile byte-for-byte.
- [ ] The guide does not duplicate rules from `AGENT.md` or `Design.md`; it
      links to them.
- [ ] Every instruction in the guide was executed at least once against
      the deployed site while writing it.

## Verification

Walk the guide yourself, step by step, on the deployed site, then watch
someone else do it. In the PR, record:

- what change they made,
- how long it took,
- every point where they asked a question,
- what you changed in the guide as a result.

```bash
# confirm the documented timing claim is true
# edit meta.description in /admin, publish, then poll
for i in $(seq 1 6); do
  curl -s https://<prod-url>/bang-gia | grep -o 'name="description" content="[^"]*"'
done
```

## Notes

- If the walkthrough reveals a CMS affordance that is confusing, the better
  fix is often a `admin.description` in the config rather than a paragraph
  in the guide — a guardrail in the config beats a line in a handover
  document (AGENT.md 5.6). Report such findings; fix them in a follow-up
  task, not in this PR.

## Flags

- The whole editor guide is user-facing Vietnamese. Do not machine-translate
  it. If Vietnamese copy cannot be written properly, deliver the English
  structure with `TODO(copy)` per section and flag that Gate 4 is blocked
  on translation.

---

> **Gate 4 — Search Console has indexed the home page and at least one
> service page, and an editor has published a change unaided.**
