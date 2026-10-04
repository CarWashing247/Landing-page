# T-04C · Structured logging

| | |
| --- | --- |
| Phase | 1 — Foundation |
| Branch | `t-04c-structured-logging` |
| Depends on | T-01, T-04B (the Vault connection is this logger's first consumer) |
| Blocks | Gate 1 |
| Critical path | no — but every later task that handles a request logs through it |

## Goal

One logger, one line format, and enough of it in place that the two questions
asked during an incident have answers in the log: **did the thing this
request depended on answer, and what did this request do?**

```
[timestamp] [source IP] [LEVEL] [action / method] [content]
```

```
[2026-10-04T12:45:13.482Z] [203.0.113.7]  [INFO]  [POST /api/revalidate] purged tag=page:vi:bang-gia
[2026-10-04T12:45:13.901Z] [-]            [INFO]  [vault:login] connected addr=https://…hashicorp.cloud:8200
[2026-10-04T12:45:14.112Z] [-]            [ERROR] [vault:login] refused status=403 hint=namespace
[2026-10-04T12:45:15.220Z] [198.51.100.4] [ERROR] [POST /api/revalidate] rejected reason=bad-signature
[2026-10-04T12:45:16.004Z] [-]            [DEBUG] [r2:upload] signing key=media/hero-1.webp size=184320
```

The format and its reasoning are Design.md section 1.5; the rule every task
is held to is AGENT.md section 5.8.

This deploy has no log aggregator and will not get one. The only tool is
Vercel's log stream, so the four fixed leading fields are what make it
`grep`-able — `grep ' \[ERROR\] '`, `grep '\[vault:'`, `grep '203.0.113.7'`.
Free-form `console.log` is not, and that is the difference between a
five-minute answer and an afternoon.

## The format

| Field | Rule |
| --- | --- |
| timestamp | ISO 8601, UTC, milliseconds (`new Date().toISOString()`). Never local time — the deploy, Postgres and Vault are in three different zones, and correlating them by eye is the thing that goes wrong at 2am |
| source IP | First hop of `x-forwarded-for`. `-` when there is no request |
| level | `DEBUG`, `INFO`, `ERROR`, upper case, padded so the columns line up |
| action | `METHOD /path` when serving a request, `module:operation` otherwise (`vault:login`, `r2:upload`, `payload:migrate`) |
| content | One short clause, then `key=value` pairs. Scalars only |

Pad the level and the IP to a fixed width. Columns that line up are readable
in a stream; columns that do not are the reason people stop reading logs.

## Two limits that are forced, not chosen

**The source IP cannot be in every line.** `loadSecrets()` runs at module
init — during `next build`, `payload migrate`, `payload generate:types` and
every cold start. There is no request and no IP. The same is true of every
pure function. Those lines carry `-`, and that is not a degraded case: it is
what distinguishes build-time from request-time at a glance.

**Nothing logs from a page or a layout.** The IP comes from `headers()`, and
reading it makes the route `ƒ`, which breaks AGENT.md 5.1 and the static
rendering the whole SEO design rests on. This is the sharpest edge in the
task: the obvious place to add a log line is the one place it must not go.
A build that turns `○` into `ƒ` has failed this task even if every line is
correctly formatted.

## Scope

**In scope**

- `src/lib/log.ts` — `logger(action)` returning `{ debug, info, error }`.
  Level filtered by `LOG_LEVEL`, default `info`. Writes with `console.*`,
  which is what Vercel captures; no dependency, and no Node built-in, so it
  runs wherever a handler does.
- A request-context helper that extracts the IP from a `Request`/`Headers`,
  so no caller hand-parses `x-forwarded-for` and gets the hop order wrong.
- Redaction: a deny-list of key names (`*secret*`, `*token*`, `*password*`,
  `authorization`, `cookie`) whose values are replaced with `[redacted]`,
  plus a guard that refuses to serialise an object or a `Request` body.
- Wire the first consumers: the Vault loader (`vault:login`, `vault:read`, on
  success and failure), the resolved database host, and the media-storage
  decision in `resolveR2Config()` — R2 or local disk. Log what this code
  observes: `loadSecrets()` makes the Vault request itself, while Postgres is
  connected by Payload's adapter, so what is loggable there is the
  configuration handed to it, not a socket.
- Move `secrets.ts`'s existing `console.warn` onto the logger as `INFO`.
- `.env.example` and `docs/deployment.md` gain `LOG_LEVEL`.
- Unit tests: the format, the level filter, the `-` IP, the `x-forwarded-for`
  hop order, and that a secret-shaped key is redacted.

**Out of scope**

- A log aggregator, a drain, or shipping anywhere off Vercel. Revisit when
  someone is actually on call.
- Request tracing / correlation IDs across lambda invocations. Worth having
  if this grows a second service; today there is one.
- Payload's own internal log output. It has its own logger and reformatting
  it means fighting the framework for no gain.
- Vault audit-device logs — that is T-22, and it is Vault's record of who
  read a credential, not this app's record of what it did.
- Route handlers that do not exist yet. `/api/revalidate` and `/api/draft`
  are T-11 and T-12; this task gives them the logger and the rule, and each
  wires its own handler. Do **not** stub their files here.

## Steps

1. Write `src/lib/log.ts` and its tests. Format first, then the level filter,
   then redaction.
2. Wire the Vault loader. This is the case that proves the design: it has no
   request context, it must log success as well as failure, and it must do
   so without putting the role id, the secret id or any returned value in the
   line.
3. Wire the Postgres and R2 connection outcomes.
4. Reclassify the existing `console.warn` in `secrets.ts`.
5. Add `LOG_LEVEL` to `.env.example` and the runbook's variable table.
6. Confirm `grep -rn 'console\.' src/` finds nothing outside `log.ts` and
   tests, and that the build still shows `○` for every public page.

## Consequences to accept knowingly

**Log volume is billed.** Vercel charges for log retention beyond its
included allowance, and `LOG_LEVEL=debug` in a deployed environment is how
that bill arrives. The default is `info` for that reason, and `debug` is
documented as a local setting.

**A source IP is personal data** under Decree 13/2023, and these lines are
retained by a third party (Vercel) outside Vietnam. The IP is in the format
because an abusive caller has to be identifiable; that is also the argument
for logging nothing beyond these five fields, and for never logging a
request body. If the site later collects customer data through a form, the
retention question becomes real rather than theoretical — flag it then.

**Every log line is a chance to leak a credential.** The convenient thing to
log is the object that holds one. Redaction by key name catches the common
shape and will not catch a secret passed as a positional value, so the rule
stays "scalars and named fields only" and the test suite asserts it.

## Acceptance criteria

Inherits AGENT.md section 8. In addition:

- [ ] `grep -rn 'console\.' src/` finds nothing outside `src/lib/log.ts` and
      test files.
- [ ] Every line matches
      `^\[\S+Z\] \[\S+\] \[(DEBUG|INFO|ERROR)\s*\] \[[^\]]+\] ` — asserted by
      a test, not by eye.
- [ ] A cold start logs `[vault:login] connected`. Starting with a wrong
      `VAULT_SECRET_ID` logs an `ERROR` that names neither the role id nor
      the secret id.
- [ ] A request to a route handler logs the caller's IP; a `next build` logs
      `-` in that field.
- [ ] `LOG_LEVEL=info` emits no `DEBUG` line; `LOG_LEVEL=debug` emits them.
      Unset behaves as `info`.
- [ ] No secret, session token, password or request body appears in any line,
      including on the Vault and database failure paths.
- [ ] `npm run build` still shows `○` for every public page. No logging call
      exists in any page or layout.
- [ ] The logger pulls in no Node built-in, so it is safe anywhere a route
      handler can run: `console`, `Date`, `process.env`, `Headers` and nothing
      else. Verified by building a throwaway `runtime = 'edge'` handler that
      logs — it compiles and runs.
      **Do not add an edge route to satisfy this.** Next 16 deprecates the
      Edge Runtime (`node_modules/next/dist/docs/01-app/03-api-reference/07-edge.md`
      — it is now for Proxy only) and the build warns on it. The criterion is
      the absence of Node built-ins, not the presence of an edge route.

## Verification

```bash
npm test                                   # format, levels, redaction, IP parsing
npm run build                              # every public page still ○
LOG_LEVEL=debug npm run start 2>&1 | head  # vault:login connected, with a - IP
```

Then the things a green build does not cover:

```bash
# 1. the format holds end to end, not just in unit tests
LOG_LEVEL=debug npm run start 2>&1 \
  | grep -E '^\[[0-9T:.Z-]+\] \[\S+\] \[(DEBUG|INFO|ERROR)' || echo 'FORMAT DRIFT'

# 2. a real request carries a real IP through the proxy chain
curl -s -H 'x-forwarded-for: 203.0.113.7, 10.0.0.1' localhost:3000/api/users/me
#    expect [203.0.113.7], the first hop, not the last and not the comma list

# 3. the failure path says enough and no more
VAULT_SECRET_ID=00000000-0000-0000-0000-000000000000 npm run migrate:deploy 2>&1 \
  | grep -i 'vault'
#    expect an ERROR naming Vault; then grep the same output for the real
#    role_id and secret_id and expect nothing

# 4. no secret anywhere in a full run's output
#    (grep each value from Vault against the captured log)
```

Check 3 is the one to repeat after any change here: it is where the format's
convenience and AGENT.md 5.7 pull against each other, and a leak is silent.

## Flags

- `WARN` is deliberately absent, because the request named three levels. The
  one existing warn-shaped case (`secrets.ts` on an unread Vault key) becomes
  `INFO` and is quieter than it deserves. Recorded in Design.md 5a.
- The IP is only as trustworthy as the proxy in front of it.
  `x-forwarded-for` is caller-supplied and spoofable; on Vercel the platform
  overwrites the first hop, which is why the first hop is the one to read.
  Do not use a logged IP as an access-control input.

---

> **Gate 1 — admin login works, the deploy is green, both locales resolve, no
> secret sits in an environment variable except the Vault bootstrap, and
> every connection and route says so in the log.**
