import assert from "node:assert/strict";
import { test } from "node:test";
import {
  exportSettings,
  parseSettings,
  readStored,
  SETTINGS_VERSION,
} from "../../supabase/functions/_shared/settingsFile.ts";
import { DEFAULT_SETTINGS } from "../../supabase/functions/_shared/types.ts";
import { settings } from "./helpers.ts";

test("저장값이 없거나 객체가 아니면 없는 것으로 본다", () => {
  assert.equal(readStored(null), null);
  assert.equal(readStored("문자열"), null);
  assert.equal(readStored(3), null);
});

test("판 번호 없는 옛 저장분: 기본값으로 채워졌던 3억·600만은 비우고 나머지는 둔다", () => {
  const old = { ...settings(), totalAssetsEok: 3, incomeMan: 600 };
  const read = readStored(old);
  assert.equal(read?.totalAssetsEok, null);
  assert.equal(read?.incomeMan, null);
  assert.deepEqual(read?.people, old.people);
});

test("옛 저장분이라도 둘 중 하나만 그 값이면 사람이 넣은 값이다", () => {
  const read = readStored({ ...settings(), totalAssetsEok: 3, incomeMan: 700 });
  assert.equal(read?.totalAssetsEok, 3);
  assert.equal(read?.incomeMan, 700);
});

test("{version, settings} 꼴: 0판은 고치고, 지금 판의 3억·600만은 그대로 둔다", () => {
  const s = { ...settings(), totalAssetsEok: 3, incomeMan: 600 };
  assert.equal(readStored({ version: 0, settings: s })?.incomeMan, null);
  assert.equal(
    readStored({ version: SETTINGS_VERSION, settings: s })?.incomeMan,
    600,
  );
  // 판 칸이 망가졌으면 0판으로 본다
  assert.equal(readStored({ version: "x", settings: s })?.incomeMan, null);
  assert.deepEqual(readStored({ version: 1, settings: null }), {});
});

test("내보낸 파일을 그대로 가져오면 같은 설정이 된다", () => {
  const s = settings();
  assert.deepEqual(parseSettings(exportSettings(s)), s);
});

test("가져오기: 빠진 칸은 기본값, 개인화 파일이 아니면 거절", () => {
  assert.deepEqual(
    parseSettings(JSON.stringify({ kind: "house-settings", settings: {} })),
    DEFAULT_SETTINGS,
  );
  assert.equal(
    parseSettings(JSON.stringify({ settings: settings() })),
    undefined,
  );
  assert.equal(
    parseSettings(JSON.stringify({ kind: "house-settings", settings: 1 })),
    undefined,
  );
  assert.equal(parseSettings("{깨진"), undefined);
});
