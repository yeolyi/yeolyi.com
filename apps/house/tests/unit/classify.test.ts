import assert from "node:assert/strict";
import { test } from "node:test";
import { sidoOf } from "../../supabase/functions/_lib/myhome.ts";
import {
  classify,
  normalizeSido,
} from "../../supabase/functions/_shared/classify.ts";
import { judge } from "../../supabase/functions/_shared/verdict.ts";
import { notice, settings } from "./helpers.ts";

const s = settings(); // 경기 거주 가구

test("공급 구분은 청약홈 HOUSE_SECD 로: 04 무순위 · 06 재공급 · 11 임의공급, 처음 보는 값은 모름", () => {
  assert.equal(
    classify(notice({ kind: "잔여세대", houseSecd: "04" })).supply,
    "무순위",
  );
  assert.equal(
    classify(notice({ kind: "잔여세대", houseSecd: "06" })).supply,
    "재공급",
  );
  assert.equal(
    classify(notice({ kind: "임의공급", houseSecd: "11" })).supply,
    "임의공급",
  );
  assert.equal(
    classify(notice({ kind: "신혼희망타운", houseSecd: "10" })).supply,
    "본청약",
  );
  assert.equal(classify(notice({ houseSecd: "02" })).supply, "모름");
  assert.equal(classify(notice({ rental: true })).supply, "공공임대");
  assert.equal(
    classify(
      notice({
        source: "myhome",
        kind: "LH잔여",
        name: "○○ 오피스텔 잔여세대 일반매각",
      }),
    ).supply,
    "매각",
  );
});

test("지역 등급: 투기과열 > 청약과열 > 수도권 > 수도권 밖", () => {
  assert.equal(
    classify(notice({ regulated: true, adjusted: true })).zone,
    "투기과열",
  );
  assert.equal(
    classify(notice({ regulated: false, adjusted: true })).zone,
    "청약과열",
  );
  assert.equal(
    classify(notice({ regulated: false, sido: "인천" })).zone,
    "수도권",
  );
  assert.equal(
    classify(notice({ regulated: false, sido: "전북" })).zone,
    "수도권외",
  );
});

test("지역 판정은 공급마다: 본청약은 권역, 무순위는 전국, 재공급은 해당 시·군, 매각은 청약 아님", () => {
  assert.equal(judge(notice({ sido: "부산" }), s).region, "out");
  assert.equal(
    judge(notice({ sido: "부산", kind: "잔여세대", houseSecd: "04" }), s)
      .region,
    "in",
  );
  assert.equal(
    judge(
      notice({
        sido: "경기",
        kind: "잔여세대",
        houseSecd: "06",
        address: "경기도 수원시 어딘가",
      }),
      s,
    ).region,
    "out",
  );
  assert.equal(
    judge(
      notice({
        sido: "경기",
        kind: "잔여세대",
        houseSecd: "06",
        address: "경기도 성남시 분당구",
      }),
      s,
    ).region,
    "in",
  );
  const sale = judge(
    notice({
      source: "myhome",
      kind: "LH잔여",
      name: "다세대주택 잔여세대 일반매각",
    }),
    s,
  );
  assert.equal(sale.notSubscription, true);
  assert.equal(sale.status, "rejected");
});

test("전남광주통합특별시: 시도 칸이 한 이름으로 와도 주소의 자치구로 광주·전남을 가른다", () => {
  assert.equal(
    normalizeSido("광주", "전남광주통합특별시 북구 임동 100-1"),
    "광주",
  );
  assert.equal(
    normalizeSido("전남광주통합특별시", "전남광주통합특별시 북구 임동 100-1"),
    "광주",
  );
  assert.equal(
    normalizeSido(
      "전남광주통합특별시",
      "광주연구개발특구 첨단3지구 A8블록(전남광주통합특별시 장성군 진원면)",
    ),
    "전남",
  );
  assert.equal(
    normalizeSido("전남광주통합특별시", "광주선운2 A1블록 잔여세대"),
    "광주",
  );
  assert.equal(
    normalizeSido("전남광주통합특별시", "순천 신대 A5 잔여세대"),
    "전남",
  );
  assert.equal(
    sidoOf("전남광주통합특별시", "광주선운2 A1블록 잔여세대"),
    "광주",
  );
  assert.equal(sidoOf("전라남도"), "전남");
});

test("선착순(동·호 지정) LH 잔여는 청약이 아닌 판매로 본다", () => {
  assert.equal(
    classify(
      notice({
        source: "myhome",
        kind: "LH잔여",
        name: "[선착순 동·호지정] 영천문외 센트럴타운 공공분양주택 추가입주자 모집 공고",
      }),
    ).supply,
    "매각",
  );
  assert.equal(
    classify(
      notice({ source: "myhome", kind: "LH잔여", name: "양주옥정 추가모집" }),
    ).supply,
    "LH잔여",
  );
});

test("선착순은 개인화와 상관없이 청약 아님으로 판정돼 후보에서 빠진다", () => {
  const v = judge(
    notice({
      source: "myhome",
      kind: "LH잔여",
      name: "[선착순 동·호지정] 영천문외 센트럴타운 추가입주자 모집 공고",
    }),
    s,
  );
  assert.equal(v.notSubscription, true);
  assert.notEqual(v.status, "candidate");
});
