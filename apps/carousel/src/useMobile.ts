import { useSyncExternalStore } from "react";

// 휴대폰 폭이면 편집기를 세로 배치(장 띠·캔버스·아래 시트)로 바꾼다.
const QUERY = "(max-width: 760px)";

export function useMobile() {
	return useSyncExternalStore(
		(fn) => {
			const m = matchMedia(QUERY);
			m.addEventListener("change", fn);
			return () => m.removeEventListener("change", fn);
		},
		() => matchMedia(QUERY).matches,
	);
}
