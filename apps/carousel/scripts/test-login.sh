#!/bin/zsh
# 테스트용 1회 로그인 링크. Claude 가 로그인한 화면을 Playwright 로 확인할 때 쓴다.
# 사용: scripts/test-login.sh <돌아올 주소, 경로까지(예: http://localhost:4324/d/<id>)> [이메일]
# 이메일을 안 주면 .env.local 의 CAROUSEL_TEST_EMAIL. 링크는 마지막 것 하나만 유효하다.
# service_role 키는 키체인의 Supabase CLI 토큰으로 그때그때 받아 오고 출력하지 않는다.
set -e
cd "$(dirname "$0")/.."
[ -f .env.local ] && set -a && source .env.local && set +a
EMAIL=${2:-$CAROUSEL_TEST_EMAIL}
T=$(security find-generic-password -s "Supabase CLI" -a supabase -w 2>/dev/null | sed 's/^go-keyring-base64://'); case "$T" in sbp_*) ;; *) T=$(printf %s "$T" | base64 -d);; esac
SR=$(curl -s -H "Authorization: Bearer $T" "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_REF/api-keys?reveal=true" | python3 -c 'import json,sys; print(next(k["api_key"] for k in json.load(sys.stdin) if k["name"]=="service_role"))')
curl -s -X POST "https://$SUPABASE_PROJECT_REF.supabase.co/auth/v1/admin/generate_link" -H "apikey: $SR" -H "Authorization: Bearer $SR" -H "Content-Type: application/json" \
  -d "{\"type\":\"magiclink\",\"email\":\"$EMAIL\",\"redirect_to\":\"$1\"}" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("action_link") or d)'
