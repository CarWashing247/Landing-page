# T-21 · Analytics and Search Console

| | |
| --- | --- |
| Phase | 4 — Launch |
| Branch | `t-21-analytics-search-console` |
| Depends on | T-13, T-19 |
| Blocks | Gate 4 |
| Critical path | no |

## Goal

GA4 live with the two events that matter for this business — a call and a
directions click — and Search Console verified with the sitemap accepted.
Until Search Console is reading the sitemap, none of Phase 2's work is
observable.

## Scope

**In scope**

- GA4 loaded with the measurement ID from `SiteSettings.ga4MeasurementId`,
  not from a hardcoded string or a build-time env var.
- Loaded via `next/script` with `strategy="afterInteractive"` so it does
  not block LCP.
- Custom events on the call button and the directions button from T-19
  (and the header call CTA from T-16).
- Search Console property verified (DNS or the metadata tag from
  `SiteSettings` — prefer DNS so it does not depend on a page render).
- `/sitemap.xml` submitted, and the fetch confirmed error-free.

**Out of scope**

- Any additional tracking script. AGENT.md section 9: each one costs LCP
  and must be raised first.
- Consent management, unless legally required — raise it rather than
  assuming.
- Conversion tracking for booking (separate backend).

## Steps

1. Read `SiteSettings.ga4MeasurementId` in the frontend root layout and
   render the GA4 snippet only when it is set. An unset ID must render
   nothing, not a broken script.
2. Load with `next/script` `afterInteractive`. Confirm against T-20's
   numbers that performance stays ≥ 90.
3. Add a tiny typed `trackEvent()` helper in `src/lib/analytics.ts` so
   event names are defined once. Two events: `click_call`,
   `click_directions`.
4. Attach them to the T-19 buttons and the T-16 header CTA. The links keep
   working with JS off — the event is an enhancement only.
5. Verify both events in GA4 DebugView on the deployed URL.
6. Verify the Search Console property and submit the sitemap. Record the
   fetch status.

## Files

```
src/app/landing-page/layout.tsx
src/components/Analytics.tsx
src/lib/analytics.ts
src/components/ContactForm.tsx   # or the button components from T-19
src/components/layout/Header.tsx
```

## Acceptance criteria

Inherits AGENT.md section 8. In addition:

- [ ] Search Console accepts the sitemap and reports **no fetch errors**.
- [ ] Both custom events (`click_call`, `click_directions`) are visible in
      GA4 DebugView.
- [ ] The measurement ID comes from `SiteSettings` — changing it in
      `/admin` changes the rendered snippet after revalidation, with no
      deploy.
- [ ] With `ga4MeasurementId` empty, no analytics script is rendered and no
      console error appears.
- [ ] Mobile Lighthouse performance is still ≥ 90 on the three T-20 routes.
- [ ] Call and directions links still work with JavaScript disabled.
- [ ] No tracking script beyond GA4.

## Verification

```bash
curl -s https://<prod-url>/ | grep -oE 'gtag|googletagmanager[^"]*' | head
curl -s https://<prod-url>/sitemap.xml | head -5
# the ID must be the CMS one, not a literal in the bundle
grep -rn "G-[A-Z0-9]\{8,\}" src && echo 'HARDCODED ID — fix' || echo 'no hardcoded measurement id'
# re-check perf after adding the script
npx lighthouse https://<prod-url>/ --form-factor=mobile --only-categories=performance,seo \
  --output=json --output-path=/tmp/lh21.json --quiet
python3 -c "import json;c=json.load(open('/tmp/lh21.json'))['categories'];print(round(c['performance']['score']*100), round(c['seo']['score']*100))"
```

Then, in GA4 DebugView, click both buttons on the deployed site and confirm
each event arrives. Record screenshots or the event list in the PR.

## Notes

- DebugView needs debug mode on (the GA debug extension, or
  `debug_mode: true` on the config call in a non-production environment).
  Do not ship `debug_mode: true` to production.
- Verifying Search Console via DNS survives a layout change; verifying via
  a meta tag depends on `SiteSettings` continuing to render it.

## Flags

- GA4 measurement ID and Search Console account access are external
  credentials. If they are not available, implement the wiring, leave
  `ga4MeasurementId` empty, verify the empty-state path, and flag the two
  remaining manual steps explicitly as not done.
