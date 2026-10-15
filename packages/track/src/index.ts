// 방문 기록. 페이지를 열 때와 같은 문서 안에서 주소가 바뀔 때(pushState·뒤로 가기) Supabase 의 public.track 을 부른다.
// 쿠키·로컬 저장소는 쓰지 않는다. 방문자 구분은 DB 가 IP·UA 로 하루 단위 해시를 만든다(apps/stats/supabase/sql).
// 개발 서버에선 보내지 않는다. 로컬도 운영 DB 를 쓰므로 섞이면 안 된다.
// - site: 사이트 이름(sites.ts 의 키, 바깥 사이트는 그 이름).
export function startTracking(site: string) {
  const env = import.meta.env;
  if (env.DEV) return;
  const url = env.PUBLIC_SUPABASE_URL;
  const key = env.PUBLIC_SUPABASE_ANON_KEY;

  let last = "";
  // 바깥에서 들어온 첫 페이지만 유입처가 있다. 사이트 안 이동이나 같은 문서 안 이동은 비운다.
  let referrer: string | null = externalReferrer();
  const send = () => {
    const path = normalize(location.pathname);
    if (path === last) return;
    last = path;
    fetch(`${url}/rest/v1/rpc/track`, {
      method: "POST",
      keepalive: true,
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        p_site: site,
        p_path: path,
        p_referrer: referrer,
      }),
    }).catch(() => {});
    referrer = null;
  };

  send();
  addEventListener("popstate", send);
  const push = history.pushState;
  history.pushState = function (...args) {
    push.apply(this, args);
    send();
  };
}

function normalize(path: string) {
  const p = path.replace(/\/+$/, "").replace(/\/{2,}/g, "/");
  return p === "" ? "/" : p;
}

function externalReferrer() {
  if (!document.referrer) return null;
  try {
    const host = new URL(document.referrer).hostname;
    return host === location.hostname ? null : host;
  } catch {
    return null;
  }
}
