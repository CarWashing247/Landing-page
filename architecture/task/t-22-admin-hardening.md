# T-22 · Admin hardening

| | |
| --- | --- |
| Phase | 4 — Launch |
| Branch | `t-22-admin-hardening` |
| Depends on | T-03, T-13 |
| Blocks | nothing |
| Critical path | no — independent of all UI work |

## Goal

The admin panel is on the public internet, shares a domain with the
marketing site, and is used by non-technical staff. This task covers the
four controls that make that acceptable: login throttling, 2FA for admins,
crawl exclusion, and a **tested** backup.

## Scope

**In scope**

- Rate limit the Payload login route — attempts per IP and per email, with
  a lockout window.
- 2FA for `admin` accounts (TOTP). `editor` accounts optional; say which
  you chose and why in the PR.
- Confirm `/admin` and `/api` are disallowed in `robots.txt` (delivered in
  T-13 — verify, do not re-implement).
- Daily automated Postgres backups, with retention stated.
- **A restore actually performed once**, into a scratch database, and the
  result verified.

**Out of scope**

- Moving `/admin` to a separate domain or behind a VPN. One repo, one
  deploy, one domain is fixed in AGENT.md section 2.
- A WAF or bot-management product.
- Secret rotation policy — note it as a recommendation if you think it is
  needed.

## Steps

1. Configure Payload's `auth.maxLoginAttempts` and `auth.lockTime` on
   `Users`. Verify the lockout actually engages rather than trusting the
   setting.
2. Add an IP-level rate limit in front of the login/API route (middleware
   or the platform's own limiter).
3. Enable TOTP 2FA for `admin`. Document enrolment in a line that T-24 can
   reuse.
4. Verify robots: `curl` the live `robots.txt` and check both disallows.
5. Set up daily backups on the Postgres provider, with retention noted in
   the PR.
6. **Restore test:** take the latest backup, restore into a scratch
   database, point a local run at it, confirm `/admin` logs in and content
   is present. Record what you did and what you saw.

## Files

```
src/collections/Users.ts        # maxLoginAttempts, lockTime, 2FA
src/middleware.ts               # rate limit, if implemented here
docs/runbook-backup-restore.md  # the restore procedure you actually ran
```

## Acceptance criteria

Inherits AGENT.md section 8. In addition:

- [ ] Repeated failed logins are throttled — the lockout is observed, with
      the attempt count and window recorded.
- [ ] 2FA is enabled and enforced for `admin` accounts; an admin login
      without the second factor fails.
- [ ] `robots.txt` on the deployed URL disallows `/admin` and `/api`.
- [ ] Daily Postgres backups are scheduled, with retention stated.
- [ ] **A restore from backup has been tested at least once**, with the
      steps and the outcome written down.
- [ ] Rate limiting does not break the T-11 revalidate webhook or the T-12
      draft route — both still work after the limiter is in place.

## Verification

```bash
# lockout engages
for i in $(seq 1 12); do
  curl -s -o /dev/null -w "$i:%{http_code} " -X POST -H 'content-type: application/json' \
    -d '{"email":"test@example.com","password":"wrong"}' https://<prod-url>/api/users/login
done; echo
# expect 401s then a lockout response

curl -s https://<prod-url>/robots.txt
# webhook and draft route still reachable
curl -s -o /dev/null -w 'revalidate: %{http_code}\n' -X POST \
  -H "content-type: application/json" -H "x-revalidate-secret: $REVALIDATE_SECRET" \
  -d '{"tags":["sitemap"]}' https://<prod-url>/api/revalidate
```

Restore test is manual: document the commands you ran and paste the
verification output into the PR.

## Notes

- A backup you have never restored is a hypothesis. The restore test is the
  deliverable here, not the backup schedule.
- Rate limiting the whole `/api` prefix will break the webhook and the
  Payload admin's own requests. Scope the limiter to the login route.

## Flags

- Backup configuration and 2FA enforcement may depend on the Postgres
  provider's and Payload version's capabilities. If a control is not
  available, say so plainly and propose the nearest alternative — do not
  mark the criterion met.
