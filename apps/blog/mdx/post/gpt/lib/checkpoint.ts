/**
 * 체크포인트 (역)직렬화.
 * 포맷: JSON 헤더(config, vocab, tensor shape 목록) + fp16 이진 버퍼.
 * fp16은 수동 인코딩 (Float16Array 미지원 브라우저 대비).
 */
import type { CheckpointHeader } from "./protocol";

function f32ToF16Bits(val: number): number {
  const f32 = new Float32Array(1);
  const u32 = new Uint32Array(f32.buffer);
  f32[0] = val;
  const x = u32[0];
  const sign = (x >>> 16) & 0x8000;
  let exp = (x >>> 23) & 0xff;
  let frac = x & 0x7fffff;
  if (exp === 0xff) return sign | 0x7c00 | (frac ? 1 : 0); // Inf/NaN
  exp = exp - 127 + 15;
  if (exp >= 0x1f) return sign | 0x7c00; // overflow → Inf
  if (exp <= 0) {
    if (exp < -10) return sign; // underflow → 0
    frac = (frac | 0x800000) >> (1 - exp);
    return sign | (frac >> 13);
  }
  return sign | (exp << 10) | (frac >> 13);
}

function f16BitsToF32(bits: number): number {
  const sign = (bits & 0x8000) << 16;
  const exp = (bits >>> 10) & 0x1f;
  const frac = bits & 0x3ff;
  const u32 = new Uint32Array(1);
  const f32 = new Float32Array(u32.buffer);
  if (exp === 0) {
    if (frac === 0) u32[0] = sign;
    else {
      // subnormal
      let e = -1;
      let f = frac;
      do {
        e++;
        f <<= 1;
      } while ((f & 0x400) === 0);
      u32[0] = sign | ((127 - 15 - e) << 23) | ((f & 0x3ff) << 13);
    }
  } else if (exp === 0x1f) {
    u32[0] = sign | 0x7f800000 | (frac << 13);
  } else {
    u32[0] = sign | ((exp - 15 + 127) << 23) | (frac << 13);
  }
  return f32[0];
}

export function encodeF16(data: Float32Array): Uint16Array {
  const out = new Uint16Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = f32ToF16Bits(data[i]);
  return out;
}

export function decodeF16(bits: Uint16Array): Float32Array {
  const out = new Float32Array(bits.length);
  for (let i = 0; i < bits.length; i++) out[i] = f16BitsToF32(bits[i]);
  return out;
}

// 수 MB짜리 체크포인트를 컴포넌트마다 다시 받지 않게 URL별로 캐시
const checkpointCache = new Map<
  string,
  Promise<{ header: CheckpointHeader; buffer: ArrayBuffer }>
>();

/** fetch로 배포된 사전학습 체크포인트 로드 */
export async function fetchCheckpoint(
  baseUrl: string,
): Promise<{ header: CheckpointHeader; buffer: ArrayBuffer }> {
  let promise = checkpointCache.get(baseUrl);
  if (!promise) {
    promise = Promise.all([
      fetch(`${baseUrl}.json`).then((r) => {
        if (!r.ok) throw new Error(`checkpoint header ${r.status}`);
        return r.json() as Promise<CheckpointHeader>;
      }),
      fetch(`${baseUrl}.bin`).then((r) => {
        if (!r.ok) throw new Error(`checkpoint bin ${r.status}`);
        return r.arrayBuffer();
      }),
    ]).then(([header, buffer]) => ({ header, buffer }));
    // 실패가 캐시에 남으면 재시도가 불가능하다 — 비워서 재시도 허용
    promise.catch(() => checkpointCache.delete(baseUrl));
    checkpointCache.set(baseUrl, promise);
  }
  const { header, buffer } = await promise;
  // 호출자가 버퍼를 워커로 transfer하면 원본이 detach되므로 복사본을 준다
  return { header, buffer: buffer.slice(0) };
}

// ---- IndexedDB (독자가 학습한 모델 저장) ----

const DB_NAME = "gpt-post";
const STORE = "checkpoints";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveCheckpoint(
  key: string,
  header: CheckpointHeader,
  buffer: ArrayBuffer,
): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ header, buffer }, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadCheckpoint(
  key: string,
): Promise<{ header: CheckpointHeader; buffer: ArrayBuffer } | null> {
  const db = await openDb();
  const result = await new Promise<{
    header: CheckpointHeader;
    buffer: ArrayBuffer;
  } | null>((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}
