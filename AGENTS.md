# AGENTS.md

> **Read [`AGENT.md`](./AGENT.md) first and treat it as binding.**
> It holds the stack, commands, repo layout, non-negotiable rules and the
> definition of done. This file only adds how to *work* in this repo —
> it does not repeat or override anything in `AGENT.md`.
>
> Task breakdown and dependency order live in [`Design.md`](./architecture/Design.md).

---

## Before you start a task

0. Read [`architecture/checklist.md`](./architecture/checklist.md). It says what
   is done, what the previous task left open, and which claims are not yet
   backed by a check that was run. Start there, not from memory of this
   conversation.
1. Open `Design.md`, find the task ID, read its acceptance criteria.
2. Check its `Depends on` list. If a dependency is not merged, say so and
   stop rather than stubbing it out.
3. Re-read section 5 of `AGENT.md` (non-negotiable rules). Most regressions
   in this repo come from quietly breaking one of them.

## Working style

**Plan before editing when a task touches more than two files.** State which
files you will change and why, then edit. For a one-file change, just do it.

**Read before you write.** Never create a component, hook or utility without
checking `src/components/` and `src/lib/` for an existing one. This repo is
small enough that duplication is always a mistake.

**When adding or changing a `Pages.layout` block**, update its matching
`public/block-previews/<slug>.svg` and `admin.images.thumbnail` in the same
task. Use the local `ui-ux-pro-max` skill for the visual review when available;
the source and expected seven-block set are in
`design/phase3/block-picker.html` and T-19D. Inspect the image in the actual
Payload Add block drawer at desktop and phone widths, including keyboard focus
and both content locales. Check each available admin language. Keep the label
from Payload rather than baking words
into the image.

**One task per branch and per PR.** Design.md task IDs map 1:1 to PRs.
Branch name: `t-07-sitemap-robots`.

**Do not reformat files you did not otherwise change.** No drive-by
reorganisation, no renaming things you merely read.

**Verify, do not assume.** After a change that affects rendered output, run
the build and actually inspect the result. For SEO changes that means
reading the HTML source, not trusting that `generateMetadata` was called.

```bash
npm run build && npm run start
curl -s localhost:3000/bang-gia | grep -iE '<title|og:|application/ld\+json'
```

A browser devtools inspector shows the DOM after hydration, which is not
what a crawler sees. `curl` and `view-source:` are what count here.

## Scope discipline

If you find a bug or a rule violation outside the current task, **report it,
do not fix it**. Add it to your final message as a short list. An unrelated
fix inside a focused PR makes review harder and hides the regression it
eventually causes.

If a task as written in `Design.md` turns out to be wrong or impossible,
stop and explain. Do not silently redesign it.

## When you are unsure

State the uncertainty rather than guessing. Specifically:

- **Vietnamese user-facing copy** — write `TODO(copy): <english gist>` and
  flag it. Do not machine-translate.
- **Real business data** — address, phone, opening hours, prices. Use the
  obvious placeholder and flag it. Never invent a plausible-looking Hanoi
  address; it will end up in JSON-LD and in Google Business Profile.
- **A choice between two reasonable designs** — ask, with a recommendation
  and the trade-off in one line each.

## Things that commonly go wrong here

| Symptom | Cause to check first |
| --- | --- |
| Shared link has no image on Zalo/Facebook | `metadataBase` missing, or OG image URL is relative |
| Edited content does not appear on the live page | Payload query missing its `next.tags`, so `revalidateTag` has nothing to purge |
| Old URL still serves after a slug change | `afterChange` hook not sending `previousDoc.slug` |
| Page missing from Google | `noindex` left on, or page excluded from `sitemap.ts` by the draft filter |
| LCP regression | New image not using `next/image`, or a client component pulled above the fold |
| Type errors after a CMS change | `npx payload generate:types` not run |

## Finishing a task

**Update [`architecture/checklist.md`](./architecture/checklist.md) first**:
move the task to done with its PR number, and add whatever it left behind to
"Still open" or to `follow-ups.md`. The checklist is how the next task knows
where things stand; a task that is finished but not recorded is one the next
person repeats.

Then your final message should contain, in this order:

1. What changed, in one or two sentences.
2. The verification you actually ran, with its result.
3. Anything you found but did not fix.
4. Anything you flagged as `TODO(copy)` or placeholder data.

Do not claim a check passed unless you ran it.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
