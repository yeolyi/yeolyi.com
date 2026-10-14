// OffscreenCanvas를 사용한 이미지 픽셀화 Web Worker

let cachedBitmap = null;

self.onmessage = async (e) => {
  const { imageBitmap, width, height } = e.data;

  // 이미지가 전달되면 캐시
  if (imageBitmap) {
    cachedBitmap = imageBitmap;
  }

  if (!cachedBitmap) return;

  // OffscreenCanvas 생성 (DOM 없이 canvas 사용 가능)
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // 원본을 타깃 비율로 중앙 크롭해 그린다 — 원본과 캔버스 비율이 달라도
  // 찌그러지지 않고, 픽셀도 정사각형으로 유지된다.
  const targetRatio = width / height;
  let sw = cachedBitmap.width;
  let sh = cachedBitmap.height;
  if (sw / sh > targetRatio) {
    sw = Math.round(sh * targetRatio);
  } else {
    sh = Math.round(sw / targetRatio);
  }
  const sx = Math.round((cachedBitmap.width - sw) / 2);
  const sy = Math.round((cachedBitmap.height - sh) / 2);
  ctx.drawImage(cachedBitmap, sx, sy, sw, sh, 0, 0, width, height);

  // 캔버스를 Blob으로 변환
  const blob = await canvas.convertToBlob({ type: "image/png" });

  // 메인 스레드로 결과 전송
  self.postMessage({ blob });
};
