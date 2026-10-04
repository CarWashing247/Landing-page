#!/usr/bin/env bash
#
# Seed the local development Vault: KV v2 mount, one secret, and an AppRole.
#
# The AppRole is the point. Deployed environments authenticate that way, and a
# development path that used the root token instead would mean the auth code
# this app actually runs is only ever exercised in production. One code path,
# one auth method — the same reasoning as `push: false` on the Postgres
# adapter (AGENT.md section 3).
#
# Driven over Vault's HTTP API with curl, rather than `docker compose exec
# vault vault …`, so it needs no Vault CLI and does not care whether Vault is
# in Docker, on a host or somewhere else.
#
# Vault dev mode keeps nothing, so re-run this after every
# `docker compose up`. It is idempotent apart from the secret_id, which is
# newly issued each run and printed for you to paste into .env.
#
# Usage:
#   docker compose up -d
#   ./scripts/vault-seed.sh
#
set -euo pipefail

ADDR="${VAULT_ADDR:-http://127.0.0.1:8200}"
# Named to match docker-compose.yml, which sets VAULT_DEV_ROOT_TOKEN_ID — that
# is the variable Vault's dev mode itself reads. The old spelling here
# (VAULT_DEV_ROOT_TOKEN) matched nothing, so changing the token in compose left
# this script still sending the default and failing as "could not enable KV v2".
TOKEN="${VAULT_DEV_ROOT_TOKEN_ID:-${VAULT_DEV_ROOT_TOKEN:-dev-root-token}}"
MOUNT="${VAULT_MOUNT:-kv}"
SECRET_PATH="${VAULT_SECRET_PATH:-$MOUNT/autowash247/development}"
ROLE='autowash247-development'

# The path within the mount: kv/autowash247/development -> autowash247/development
#
# Checked rather than assumed. `${VAR#prefix}` is a no-op when the prefix does
# not match, so a VAULT_SECRET_PATH on a different mount used to sail through
# and seed `kv/data/secret/autowash247/...` — one level below where the loader
# reads, with no error anywhere.
if [ "${SECRET_PATH%%/*}" != "$MOUNT" ]; then
  echo "VAULT_SECRET_PATH ($SECRET_PATH) is not on VAULT_MOUNT ($MOUNT)." >&2
  echo "Set VAULT_MOUNT to its first segment, or correct the path." >&2
  exit 2
fi
REL_PATH="${SECRET_PATH#"$MOUNT"/}"

# `node` rather than `jq`, which is not installed everywhere; this is a Node
# project, so node always is.
json_field() {
  node -e '
    let raw = ""
    process.stdin.on("data", (c) => (raw += c))
    process.stdin.on("end", () => {
      try {
        const path = process.argv[1].split(".")
        let value = JSON.parse(raw)
        for (const key of path) value = value?.[key]
        if (value === undefined) process.exit(1)
        process.stdout.write(String(value))
      } catch {
        process.exit(1)
      }
    })
  ' "$1"
}

api() {
  local method="$1" path="$2" body="${3:-}"
  if [ -n "$body" ]; then
    curl -sS -X "$method" -H "x-vault-token: $TOKEN" \
      -H 'content-type: application/json' -d "$body" "$ADDR/v1/$path"
  else
    curl -sS -X "$method" -H "x-vault-token: $TOKEN" "$ADDR/v1/$path"
  fi
}

# A write whose result is discarded is a write that can fail silently, and this
# script ends by printing a bootstrap pair that then does not work. Vault
# answers a successful write with either an empty body or one with no "errors"
# key, so anything containing "errors" is a failure worth stopping for.
write() {
  local what="$1" method="$2" path="$3" body="$4"
  local out
  out="$(api "$method" "$path" "$body")" || {
    echo "    could not $what: curl failed talking to $ADDR" >&2
    exit 1
  }

  if printf '%s' "$out" | grep -q '"errors":\[.'; then
    echo "    could not $what: $out" >&2
    exit 1
  fi
}

# Checked up front: `openssl rand` inside a command substitution does not stop
# the script when it is missing, and an absent openssl would seed
# PAYLOAD_SECRET="" — which Payload accepts shapewise and signs sessions with.
if ! command -v openssl >/dev/null 2>&1; then
  echo "openssl is required to generate the secrets this script writes." >&2
  exit 2
fi

if ! curl -sS --max-time 5 "$ADDR/v1/sys/health" >/dev/null 2>&1; then
  echo "No Vault at $ADDR. Start it with:" >&2
  echo "  docker compose up -d" >&2
  exit 1
fi

# Vault answers a duplicate enable with "path is already in use at …", which
# is the success case on a re-run, not a failure. Anything else is reported.
enable() {
  local what="$1" path="$2" body="$3"
  local out
  out="$(api POST "$path" "$body")"

  if [ -z "$out" ]; then
    echo "    $what enabled"
  elif printf '%s' "$out" | grep -q 'already in use'; then
    echo "    $what already enabled"
  else
    echo "    could not enable $what: $out" >&2
    exit 1
  fi
}

echo "==> Enabling KV v2 at $MOUNT/"
enable "KV v2 at $MOUNT/" "sys/mounts/$MOUNT" \
  '{"type":"kv","options":{"version":"2"}}'

# Generated rather than hardcoded: a committed script that wrote a known
# PAYLOAD_SECRET would make every developer's admin sessions forgeable by
# anyone who has read the repo.
#
# Existing values are left alone unless --force, because rewriting
# PAYLOAD_SECRET invalidates every admin session signed with the old one —
# a surprising thing for a script called "seed" to do on a re-run.
echo "==> Writing $SECRET_PATH"
if [ "${1:-}" != '--force' ] &&
  api GET "$MOUNT/data/$REL_PATH" | json_field 'data.data.PAYLOAD_SECRET' >/dev/null; then
  echo "    already seeded, leaving it alone (--force to regenerate)"
else
  write "write the secret" POST "$MOUNT/data/$REL_PATH" "$(
    cat <<JSON
{"data":{
  "PAYLOAD_SECRET":"$(openssl rand -hex 32)",
  "REVALIDATE_SECRET":"$(openssl rand -hex 16)",
  "PREVIEW_SECRET":"$(openssl rand -hex 16)"
}}
JSON
  )"
  echo "    PAYLOAD_SECRET, REVALIDATE_SECRET, PREVIEW_SECRET generated"
fi
echo "    R2 credentials NOT seeded — local dev uses MEDIA_LOCAL_DISK=true."
echo "    To exercise the real R2 path instead, add them with:"
echo "      curl -H \"x-vault-token: \$TOKEN\" -X PATCH \\"
echo "        -H 'content-type: application/merge-patch+json' \\"
echo "        -d '{\"data\":{\"R2_BUCKET\":\"…\"}}' \\"
echo "        $ADDR/v1/$MOUNT/data/$REL_PATH"

echo "==> Enabling AppRole auth"
enable 'AppRole auth' 'sys/auth/approle' '{"type":"approle"}'

# Read on this path and nothing else. The deployed policies are the same
# shape, which is what keeps a leaked preview role out of production.
echo "==> Writing policy and role $ROLE"
write "write the policy" PUT "sys/policies/acl/$ROLE" "$(
  node -e 'process.stdout.write(JSON.stringify({
    policy: `path "${process.argv[1]}/data/${process.argv[2]}" {\n  capabilities = ["read"]\n}\n`,
  }))' "$MOUNT" "$REL_PATH"
)"

write "write the role" POST "auth/approle/role/$ROLE" "$(
  cat <<JSON
{"token_policies":"$ROLE","token_ttl":"20m","token_max_ttl":"1h"}
JSON
)"

# `json_field` exits non-zero when the field is absent, which is the only way
# to tell a real id from an error body. Printing an empty VAULT_ROLE_ID as
# though it were the bootstrap is the failure mode being closed here.
ROLE_ID="$(api GET "auth/approle/role/$ROLE/role-id" | json_field 'data.role_id')" || {
  echo "could not read the role id back — the role was not created" >&2
  exit 1
}
SECRET_ID="$(api POST "auth/approle/role/$ROLE/secret-id" '{}' | json_field 'data.secret_id')" || {
  echo "could not issue a secret id for $ROLE" >&2
  exit 1
}

cat <<EOF

Done. Put these in .env — they are the Vault bootstrap, and the only
credentials that live outside Vault (AGENT.md section 7.1):

VAULT_ADDR=$ADDR
VAULT_SECRET_PATH=$SECRET_PATH
VAULT_ROLE_ID=$ROLE_ID
VAULT_SECRET_ID=$SECRET_ID

Leave VAULT_NAMESPACE unset locally; it is an HCP Vault requirement only.
EOF
