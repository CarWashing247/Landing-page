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
