# Task files

One file per task ID in [`Design.md`](../Design.md) section 4. Each file
expands that task into scope, steps, acceptance criteria and the
verification commands to run before calling it done.

**These files do not override anything.** `AGENT.md` is the single source
of truth for rules and the definition of done; `Design.md` owns the task
list and the ordering. If a task file disagrees with either, the task file
is wrong — say so rather than following it.

Every task additionally inherits the definition of done in `AGENT.md`
section 8. The criteria in each file are *in addition* to it.

## How to use one

1. Open the task file for your ID. Read its `Depends on` row.
2. If a dependency is not **merged**, stop and say so. Do not stub it out.
3. Re-read `AGENT.md` section 5 (non-negotiable rules).
4. Work the steps. Run the commands in the Verification section — the real
   ones, against a production build.
5. Report per `CLAUDE.md` "Finishing a task": what changed, what you
   verified with its result, what you found but did not fix, what you
   flagged as `TODO(copy)` or placeholder data.

Branch names are the file names without the `.md`:
`t-09-build-metadata`. One task per branch and per PR.

## Index

### Phase 1 — Foundation

| ID | Task | Depends on |
| --- | --- | --- |
| [T-01](t-01-bootstrap-app.md) | Bootstrap the app | — |
| [T-02](t-02-media-storage.md) | Media storage and the Media collection | T-01 |
| [T-03](t-03-users-roles-access.md) | Users, roles and access control | T-01 |
| [T-04](t-04-deploy-pipeline.md) | Deploy pipeline | T-01 |

> **Gate 1** — admin login works and the deploy is green.

### Phase 2 — Content and SEO

| ID | Task | Depends on |
| --- | --- | --- |
| [T-05](t-05-globals.md) | Globals | T-02 |
| [T-06](t-06-pages-collection.md) | Pages collection | T-01 |
| [T-07](t-07-services-collection.md) | Services collection | T-06 |
| [T-08](t-08-seo-field-group.md) | SEO field group | T-06, T-07 |
| [T-09](t-09-build-metadata.md) | `buildMetadata()` and route wiring | T-08 |
| [T-10](t-10-static-generation-cache-tags.md) | Static generation and cache tags | T-09 |
| [T-11](t-11-revalidation-webhook.md) | Revalidation webhook | T-10 |
| [T-12](t-12-draft-preview.md) | Draft preview | T-11 |
| [T-13](t-13-sitemap-robots.md) | Sitemap and robots | T-10 |
| [T-14](t-14-json-ld.md) | JSON-LD | T-05, T-07, T-09 |

> **Gate 2** — `view-source:` shows complete meta tags and valid JSON-LD on
> every route type. Verify with `curl`, not devtools.

### Phase 3 — Interface

| ID | Task | Depends on |
| --- | --- | --- |
| [T-15](t-15-design-foundation.md) | Design foundation | T-04 |
| [T-16](t-16-layout-shell.md) | Layout shell | T-05, T-15 |
| [T-17](t-17-content-blocks.md) | Content blocks | T-06, T-15 |
| [T-18](t-18-service-detail-template.md) | Service detail template | T-07, T-17 |
| [T-19](t-19-contact-page.md) | Contact page | T-05, T-17 |
| [T-20](t-20-performance-pass.md) | Performance pass | T-16, T-17, T-18, T-19 |

> **Gate 3** — mobile Lighthouse at 90 or above.

### Phase 4 — Launch

| ID | Task | Depends on |
| --- | --- | --- |
| [T-21](t-21-analytics-search-console.md) | Analytics and Search Console | T-13, T-19 |
| [T-22](t-22-admin-hardening.md) | Admin hardening | T-03, T-13 |
| [T-23](t-23-content-seed.md) | Content seed | T-17, T-18, T-19 |
| [T-24](t-24-handover.md) | Handover | T-12, T-23 |

> **Gate 4** — Search Console has indexed the home page and at least one
> service page, and an editor has published a change unaided.

## Critical path

```
T-01 → T-06 → T-08 → T-09 → T-10 → T-11 → T-14 → T-17 → T-20 → T-23
```

Everything else runs alongside it. Parallelises cleanly: T-02/T-03/T-04
after T-01; T-15 and T-16 as soon as T-05 lands; T-13 needs only T-10, so
it runs while T-11 and T-12 are in flight; T-22 is independent of all UI
work.

**What must not be reordered: Phase 2 before Phase 3.** Building components
first and adding `generateMetadata` afterwards means prising metadata out of
finished components and treating JSON-LD as something pasted on at the end.
That is the failure the ordering exists to prevent.

## Tasks blocked on information we do not have

These need business data or external credentials. Each task file flags its
own, but collected here so they can be chased in one go:

| Task | Needs |
| --- | --- |
| T-02 | R2 bucket name and public hostname |
| T-04 | production domain |
| T-05 | real address, phone, opening hours, price range, lat/lng |
| T-07, T-23 | package names, prices, durations |
| T-15 | brand palette |
| T-19 | where contact form submissions go; Maps API key if needed |
| T-21 | GA4 measurement ID, Search Console access |
| T-23 | all Vietnamese marketing copy |
| T-24 | Vietnamese editor guide copy |
