#!/usr/bin/env bash
#
# Verify a deployed environment against T-04's acceptance criteria, plus the
# locale and security properties established by T-01 to T-04A.
#
# Building is not working: this is the difference. Run it after every deploy
# to a new environment.
#
#   ./scripts/verify-deployment.sh https://autowash247.vn
#
# Exits non-zero if any check fails, so it can gate a pipeline.

set -uo pipefail

BASE="${1:-}"
if [[ -z "$BASE" ]]; then
  echo "usage: $0 <base-url>" >&2
  exit 2
fi
BASE="${BASE%/}"

pass=0
fail=0

# check <description> <expected> <actual>
check() {
  local what="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    printf '  \033[32mok\033[0m    %-52s %s\n' "$what" "$actual"
    pass=$((pass + 1))
  else
    printf '  \033[31mFAIL\033[0m  %-52s got %s, want %s\n' "$what" "$actual" "$expected"
    fail=$((fail + 1))
  fi
}

# check_contains <description> <needle> <haystack>
check_contains() {
  local what="$1" needle="$2" haystack="$3"
  if [[ "$haystack" == *"$needle"* ]]; then
    printf '  \033[32mok\033[0m    %-52s %s\n' "$what" "$needle"
    pass=$((pass + 1))
  else
    printf '  \033[31mFAIL\033[0m  %-52s missing %s\n' "$what" "$needle"
    fail=$((fail + 1))
  fi
}

status() { curl -s -o /dev/null -w '%{http_code}' --max-time 30 "$1"; }
body() { curl -s --max-time 30 "$1"; }

echo "Verifying $BASE"
echo
echo "Public site"
check "home page responds"            200 "$(status "$BASE/")"
check "English home page responds"    200 "$(status "$BASE/en")"
check_contains "home page is Vietnamese"  '<html lang="vi"' "$(body "$BASE/")"
check_contains "English page is English"  '<html lang="en"' "$(body "$BASE/en")"
check "unknown URL is 404"            404 "$(status "$BASE/khong-ton-tai-$RANDOM")"
check_contains "404 page still declares a language" '<html lang="vi"' "$(body "$BASE/khong-ton-tai-$RANDOM")"

echo
echo "No page reachable at two URLs"
check "internal vi folder redirects"  308 "$(status "$BASE/landing-page")"
check "internal en folder redirects"  308 "$(status "$BASE/landing-page-en")"

echo
echo "Admin and API"
check "admin panel responds"          200 "$(status "$BASE/admin")"
check "REST API rejects anonymous reads" 403 "$(status "$BASE/api/users")"
check "GraphQL is disabled"           404 "$(status "$BASE/api/graphql-playground")"
check "internal API path is not exposed" 307 "$(status "$BASE/crm/api/slug")"

echo
echo "Crawlers"
robots_status="$(status "$BASE/robots.txt")"
if [[ "$robots_status" == "404" ]]; then
  printf '  \033[33mskip\033[0m  %s\n' "no robots.txt yet — delivered by T-13"
else
  check_contains "robots.txt disallows the admin" 'Disallow: /admin' "$(body "$BASE/robots.txt")"
  check_contains "robots.txt names the sitemap"   'Sitemap:'        "$(body "$BASE/robots.txt")"
fi

echo
echo "Secrets"
# The deploy holding a credential in an environment variable is the thing
# T-04B removed; this cannot be checked over HTTP, so it is checked where it
# can be — against the Vault bootstrap this environment was given.
if [[ -z "${VAULT_ADDR:-}" ]]; then
  printf '  \033[33mskip\033[0m  %s\n' "VAULT_ADDR not set in this shell — run with the environment's bootstrap to check Vault"
else
  vault_health="$(status "${VAULT_ADDR%/}/v1/sys/health")"
  if [[ "$vault_health" == "200" || "$vault_health" == "429" ]]; then
    printf '  \033[32mok\033[0m    %-52s %s\n' "Vault is reachable and unsealed" "$vault_health"
    pass=$((pass + 1))
  else
    printf '  \033[31mFAIL\033[0m  %-52s got %s\n' "Vault is reachable and unsealed" "$vault_health"
    printf '        503 means sealed; the app cannot boot or build until it is unsealed\n'
    fail=$((fail + 1))
  fi

  # A credential in the environment is what this task exists to prevent, so
  # finding one is a failure even though the app would still work.
  leaked=()
  for key in PAYLOAD_SECRET REVALIDATE_SECRET PREVIEW_SECRET \
    R2_BUCKET R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_ENDPOINT; do
    [[ -n "${!key:-}" ]] && leaked+=("$key")
  done
  if [[ ${#leaked[@]} -eq 0 ]]; then
    printf '  \033[32mok\033[0m    %-52s none set\n' "no credential in the environment"
    pass=$((pass + 1))
  else
    printf '  \033[31mFAIL\033[0m  %-52s %s\n' "no credential in the environment" "${leaked[*]}"
    printf '        these belong in Vault (AGENT.md 7.2), not in the environment\n'
    fail=$((fail + 1))
  fi

  if [[ -n "${VAULT_SECRET_PATH:-}" && -n "${VAULT_ROLE_ID:-}" && -n "${VAULT_SECRET_ID:-}" ]]; then
    tok="$(curl -s --max-time 30 -X POST \
      -H 'content-type: application/json' \
      ${VAULT_NAMESPACE:+-H "x-vault-namespace: $VAULT_NAMESPACE"} \
      -d "{\"role_id\":\"$VAULT_ROLE_ID\",\"secret_id\":\"$VAULT_SECRET_ID\"}" \
      "${VAULT_ADDR%/}/v1/auth/approle/login" |
      sed -n 's/.*"client_token":"\([^"]*\)".*/\1/p')"
    if [[ -n "$tok" ]]; then
      printf '  \033[32mok\033[0m    %-52s AppRole login\n' "the bootstrap credential works"
      pass=$((pass + 1))
    else
      printf '  \033[31mFAIL\033[0m  %-52s login refused\n' "the bootstrap credential works"
      printf '        a 403 here with no detail usually means VAULT_NAMESPACE is unset\n'
      fail=$((fail + 1))
    fi

    # Cross-environment read, attempted rather than inferred from the policy.
    other='production'
    [[ "$VAULT_SECRET_PATH" == *production* ]] && other='preview'
    mount="${VAULT_SECRET_PATH%%/*}"
    rest="${VAULT_SECRET_PATH#*/}"
    cross="$mount/data/${rest%/*}/$other"
    if [[ -n "$tok" ]]; then
      cross_status="$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 \
        -H "x-vault-token: $tok" \
        ${VAULT_NAMESPACE:+-H "x-vault-namespace: $VAULT_NAMESPACE"} \
        "${VAULT_ADDR%/}/v1/$cross")"
      if [[ "$cross_status" == "403" || "$cross_status" == "404" ]]; then
        printf '  \033[32mok\033[0m    %-52s %s on %s\n' "cannot read another environment's secrets" "$cross_status" "$other"
        pass=$((pass + 1))
      else
        printf '  \033[31mFAIL\033[0m  %-52s got %s on %s\n' "cannot read another environment's secrets" "$cross_status" "$other"
        printf '        one AppRole per environment, read on its own path only\n'
        fail=$((fail + 1))
      fi
    fi
  else
    printf '  \033[33mskip\033[0m  %s\n' "no AppRole in this shell — cannot test the login or cross-environment reads"
  fi
fi

echo
echo "Media"
media="$(body "$BASE/api/media?limit=1&depth=0")"
if [[ "$media" == *'"docs":[]'* || "$media" != *'"docs"'* ]]; then
  printf '  \033[33mskip\033[0m  %s\n' "no media uploaded yet — upload one and re-run"
else
  url="$(printf '%s' "$media" | sed -n 's/.*"url":"\([^"]*\)".*/\1/p' | head -1)"
  printf '  info  first media URL: %s\n' "$url"
  if [[ "$url" == http* && "$url" != "$BASE"* ]]; then
    printf '  \033[32mok\033[0m    %-52s served off-origin\n' "images come from R2, not the deploy"
    pass=$((pass + 1))
    check "image is publicly readable" 200 "$(status "$url")"
  elif [[ "$BASE" == *localhost* || "$BASE" == *127.0.0.1* ]]; then
    # Local runs legitimately use MEDIA_LOCAL_DISK, so a same-origin URL is
    # expected here and says nothing about the deployed configuration.
    printf '  \033[33mskip\033[0m  %s\n' "local run: media on disk, as MEDIA_LOCAL_DISK intends"
    check "image is publicly readable" 200 "$(status "$BASE$url")"
  else
    printf '  \033[31mFAIL\033[0m  %-52s %s\n' "images must come from R2_PUBLIC_URL" "$url"
    printf '        a same-origin URL means the storage plugin is inactive and\n'
    printf '        uploads are on a filesystem that will not survive a deploy\n'
    fail=$((fail + 1))
  fi
fi

echo
printf 'passed %d, failed %d\n' "$pass" "$fail"
[[ "$fail" -eq 0 ]] || exit 1
