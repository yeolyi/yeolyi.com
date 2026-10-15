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

export function KakaoMap({ address }: { address: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(!KEY);

  useEffect(() => {
    if (!KEY || !ref.current) return;
    let alive = true;
    const el = ref.current;
    loadSdk()
      .then(() => {
        const { maps } = window.kakao;
        new maps.services.Geocoder().addressSearch(
          address,
          // biome-ignore lint/suspicious/noExplicitAny: SDK 응답
          (result: any[], status: string) => {
            if (!alive) return;
            if (status !== maps.services.Status.OK || !result[0])
              return setFailed(true);
            const center = new maps.LatLng(result[0].y, result[0].x);
            // 휠 줌은 페이지 스크롤을 가로채서 끄고, 줌 버튼으로 대신한다.
            const map = new maps.Map(el, {
              center,
              level: 4,
              scrollwheel: false,
            });
            map.addControl(new maps.ZoomControl(), maps.ControlPosition.RIGHT);
            new maps.Marker({ map, position: center });
          },
        );
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [address]);

  if (failed) return null;
  return (
    <div
      ref={ref}
      role="img"
      aria-label={`${address} 지도`}
      className="bg-muted mt-[1rlh] aspect-[4/3] w-full sm:aspect-[16/9]"
    />
  );
}
