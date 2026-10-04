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
TOKEN="${VAULT_DEV_ROOT_TOKEN:-dev-root-token}"
MOUNT="${VAULT_MOUNT:-kv}"
SECRET_PATH="${VAULT_SECRET_PATH:-$MOUNT/autowash247/development}"
ROLE='autowash247-development'

# The path within the mount: kv/autowash247/development -> autowash247/development
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
  api POST "$MOUNT/data/$REL_PATH" "$(
    cat <<JSON
{"data":{
  "PAYLOAD_SECRET":"$(openssl rand -hex 32)",
  "REVALIDATE_SECRET":"$(openssl rand -hex 16)",
  "PREVIEW_SECRET":"$(openssl rand -hex 16)"
}}
JSON
  )" >/dev/null
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
api PUT "sys/policies/acl/$ROLE" "$(
  node -e 'process.stdout.write(JSON.stringify({
    policy: `path "${process.argv[1]}/data/${process.argv[2]}" {\n  capabilities = ["read"]\n}\n`,
  }))' "$MOUNT" "$REL_PATH"
)" >/dev/null

api POST "auth/approle/role/$ROLE" "$(
  cat <<JSON
{"token_policies":"$ROLE","token_ttl":"20m","token_max_ttl":"1h"}
JSON
)" >/dev/null

ROLE_ID="$(api GET "auth/approle/role/$ROLE/role-id" | json_field 'data.role_id')"
SECRET_ID="$(api POST "auth/approle/role/$ROLE/secret-id" '{}' | json_field 'data.secret_id')"

cat <<EOF

Done. Put these in .env — they are the Vault bootstrap, and the only
credentials that live outside Vault (AGENT.md section 7.1):

VAULT_ADDR=$ADDR
VAULT_SECRET_PATH=$SECRET_PATH
VAULT_ROLE_ID=$ROLE_ID
VAULT_SECRET_ID=$SECRET_ID

Leave VAULT_NAMESPACE unset locally; it is an HCP Vault requirement only.
EOF
