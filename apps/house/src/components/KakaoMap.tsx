import { useEffect, useRef, useState } from "react";

// 공고 주소를 카카오 지도에 핀 하나로. 주소 → 좌표는 SDK 의 services(Geocoder)가 브라우저에서 한다(서버 없음).
// 키는 공개용 JavaScript 키(PUBLIC_KAKAO_MAP_KEY)이고, 카카오 개발자 콘솔에 등록한 도메인에서만 동작한다.
// 키가 없거나, 도메인이 등록되지 않았거나, 주소를 못 찾으면 아무것도 그리지 않는다(아래 지도 링크가 그대로 있다).
const KEY = import.meta.env.PUBLIC_KAKAO_MAP_KEY as string | undefined;

declare global {
  interface Window {
    // biome-ignore lint/suspicious/noExplicitAny: 카카오 SDK 는 타입을 주지 않는다
    kakao: any;
  }
}

let sdk: Promise<void> | undefined;
function loadSdk() {
  sdk ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KEY}&autoload=false&libraries=services`;
    script.onload = () => window.kakao.maps.load(() => resolve());
    script.onerror = reject;
    document.head.append(script);
  });
  return sdk;
}

/** 주소를 좌표로. 신축 단지는 주소가 "○○동 △△ 도시개발구역 공동3BL" 처럼 블록 이름이라 못 찾는 일이 많아,
 *  뒤에서부터 한 토막씩 줄여 다시 찾는다(시도·시군구·동까지는 남긴다). 줄였으면 exact=false. */
function geocode(
  address: string,
): Promise<{ x: string; y: string; exact: boolean } | null> {
  const { maps } = window.kakao;
  const geocoder = new maps.services.Geocoder();
  const words = address.split(/\s+/).filter(Boolean);
  const tryAt = (
    n: number,
  ): Promise<{ x: string; y: string; exact: boolean } | null> =>
    n < 3
      ? Promise.resolve(null)
      : new Promise((resolve) =>
          geocoder.addressSearch(
            words.slice(0, n).join(" "),
            // biome-ignore lint/suspicious/noExplicitAny: SDK 응답
            (result: any[], status: string) =>
              status === maps.services.Status.OK && result[0]
                ? resolve({
                    x: result[0].x,
                    y: result[0].y,
                    exact: n === words.length,
                  })
                : resolve(tryAt(n - 1)),
          ),
        );
  return tryAt(words.length);
}

export function KakaoMap({ address }: { address: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "exact" | "area" | "failed">(
    KEY ? "loading" : "failed",
  );

  useEffect(() => {
    if (!KEY || !ref.current) return;
    let alive = true;
    const el = ref.current;
    loadSdk()
      .then(() => geocode(address))
      .then((hit) => {
        if (!alive) return;
        if (!hit) return setState("failed");
        const { maps } = window.kakao;
        const center = new maps.LatLng(hit.y, hit.x);
        // 휠 줌은 페이지 스크롤을 가로채서 끄고, 줌 버튼으로 대신한다. 동 단위로 찾았으면 넓게.
        const map = new maps.Map(el, {
          center,
          level: hit.exact ? 4 : 6,
          scrollwheel: false,
        });
        map.addControl(new maps.ZoomControl(), maps.ControlPosition.RIGHT);
        new maps.Marker({ map, position: center });
        setState(hit.exact ? "exact" : "area");
      })
      .catch(() => alive && setState("failed"));
    return () => {
      alive = false;
    };
  }, [address]);

  if (state === "failed") return null;
  return (
    <figure className="mt-[1rlh]">
      <div
        ref={ref}
        role="img"
        aria-label={`${address} 지도`}
        className="bg-muted aspect-[4/3] w-full sm:aspect-[16/9]"
      />
      {state === "area" && (
        <figcaption className="text-muted-foreground mt-[0.25rlh] text-base">
          주소가 개발구역 이름이라 동 단위 위치로 보입니다. 정확한 자리는
          공고문을 확인하세요.
        </figcaption>
      )}
    </figure>
  );
}
