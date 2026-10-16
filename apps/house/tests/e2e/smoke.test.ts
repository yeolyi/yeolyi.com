// 실제 브라우저로 화면을 한 바퀴 도는 연기 시험. 판정 로직은 tests/unit 이 보고, 여기선 화면이 뜨고 에러가 없는지만 본다.
// 공고는 운영 DB(실제 데이터)를 읽으니 숫자는 단정하지 않는다.
//   pnpm test:e2e                                  로컬 개발 서버(localhost:4323)
//   HOUSE_URL=https://house.yeolyi.com pnpm test:e2e 운영
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { type Browser, chromium, type Page } from "playwright";

const BASE = process.env.HOUSE_URL ?? "http://localhost:4323";
const KEY = "house:settings";

// 경기 평택에 사는 예비부부, 맞벌이 월 720만, 총자산 2.1억.
const SETTINGS = {
  people: [
    {
      name: "나",
      birth: "1996-04-12",
      sido: "경기",
      sigungu: "평택시",
      movedInAt: "2023-03-02",
      householder: true,
      accountOpenedAt: "2015-06-01",
      accountCount: 96,
      accountPaidMan: 960,
    },
    {
      name: "배우자",
      birth: "1997-09-30",
      sido: "경기",
      sigungu: "평택시",
      movedInAt: "2023-03-02",
      householder: false,
      accountOpenedAt: "2018-01-10",
      accountCount: 60,
      accountPaidMan: 600,
    },
  ],
  marriedAt: "",
  children: 0,
  newbornChild: null,
  everOwned: false,
  taxFiveYears: true,
  elderParent: false,
  totalAssetsEok: 2.1,
  incomeMan: 720,
  dualIncome: true,
  ownsHome: false,
  wonRecently: false,
  realEstateEok: 0,
};

let browser: Browser;
before(async () => {
  browser = await chromium.launch();
});
after(() => browser?.close());

/** 새 창. stored 가 있으면 첫 화면 전에 localStorage 에 넣는다(문자열은 그대로, 나머지는 JSON 으로). 콘솔 에러·페이지 에러·4xx/5xx 를 모은다. */
async function page(stored?: unknown): Promise<{ p: Page; errors: string[] }> {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 900 },
  });
  if (stored !== undefined)
    await ctx.addInitScript(
      ([k, v]) => {
        if (!sessionStorage.getItem("seeded")) {
          localStorage.setItem(k as string, v as string);
          sessionStorage.setItem("seeded", "1");
        }
      },
      [KEY, typeof stored === "string" ? stored : JSON.stringify(stored)],
    );
  const p = await ctx.newPage();
  const errors: string[] = [];
  p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  p.on("pageerror", (e) => errors.push(e.message));
  p.on(
    "response",
    (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`),
  );
  return { p, errors };
}

const go = async (p: Page, path: string) => {
  await p.goto(BASE + path);
  await p.waitForLoadState("networkidle");
};

/** 가로로 넘치는 요소가 없는지(390px). */
const noOverflow = (p: Page) =>
  p.evaluate(
    () =>
      document.documentElement.scrollWidth <=
      document.documentElement.clientWidth,
  );

test("개인화 전: 공고 목록이 뜨고 진행 중·마감으로만 나뉜다", async () => {
  const { p, errors } = await page();
  await go(p, "/");
  const scopes = await p
    .locator('[aria-label="공고 묶음"] label')
    .allInnerTexts();
  assert.deepEqual(
    scopes.map((s) => s.replace(/\s*\d+$/, "")),
    ["진행 중", "마감"],
  );
  assert.ok((await p.locator("main li a").count()) > 0, "공고가 없다");
  assert.ok(await noOverflow(p));
  assert.deepEqual(errors, []);
});

test("개인화 뒤: 후보를 본청약·무순위로 나누고, 같은 공고가 두 번 나오지 않는다", async () => {
  const { p, errors } = await page({ version: 1, settings: SETTINGS });
  await go(p, "/");
  assert.match(await p.locator("main").innerText(), /개인화에 맞춰 골랐습니다/);
  const scopes = await p
    .locator('[aria-label="공고 묶음"] label')
    .allInnerTexts();
  assert.deepEqual(
    scopes.map((s) => s.replace(/\s*\d+$/, "")),
    ["후보", "제외", "마감"],
  );
  const h2 = await p.locator("main h2").allInnerTexts();
  assert.ok(
    h2.every((h) => /^(본청약|무순위·임의공급) \d+$/.test(h)),
    `섹션 제목: ${h2}`,
  );
  const hrefs = await p
    .locator("main li > a")
    .evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  assert.equal(new Set(hrefs).size, hrefs.length, "같은 공고가 두 번");
  assert.deepEqual(errors, []);
});

test("공고 상세: 다섯 탭이 모두 뜨고 내 자격 표에 근거 조문이 붙는다", async () => {
  const { p, errors } = await page({ version: 1, settings: SETTINGS });
  await go(p, "/");
  const href = await p.locator("main li > a").first().getAttribute("href");
  assert.ok(href);
  for (const tab of ["complex", "explain", "eligibility", "rank", "schedule"]) {
    await go(p, `${href}?tab=${tab}`);
    const text = await p.locator("main").innerText();
    assert.doesNotMatch(text, /undefined|NaN|\[object/, `${tab}: ${text}`);
    assert.ok(await noOverflow(p), `${tab} 가로 넘침`);
  }
  await go(p, `${href}?tab=eligibility`);
  assert.ok((await p.locator("main table").count()) > 0, "자격 표가 없다");
  assert.match(await p.locator("main table").first().innerText(), /제\d+조/);
  // 주소로 바로 들어와도(새로 고침) 같은 화면
  await p.reload();
  await p.waitForLoadState("networkidle");
  assert.ok((await p.locator("main table").count()) > 0);
  assert.deepEqual(errors, []);
});

test("개인화 요약: 답이 보이고 바꾸기 링크가 질문 화면으로 간다", async () => {
  const { p, errors } = await page({ version: 1, settings: SETTINGS });
  await go(p, "/settings");
  const main = await p.locator("main").innerText();
  assert.match(main, /720만/);
  const change = p.locator("main a", { hasText: "바꾸기" }).first();
  await change.click();
  await p.waitForLoadState("networkidle");
  assert.match(p.url(), /\/settings\/[\w-]+/);
  assert.ok((await p.locator("main h1").innerText()).length > 0);
  assert.deepEqual(errors, []);
});

test("옛 저장분: 판 번호 없는 값과 0판의 3억·600만 기본값을 고쳐 읽는다", async () => {
  // 판 번호 없는 옛 형식: 값 자체가 설정이다
  {
    const { p, errors } = await page(SETTINGS);
    await go(p, "/");
    assert.match(
      await p.locator("main").innerText(),
      /개인화에 맞춰 골랐습니다/,
    );
    assert.deepEqual(errors, []);
  }
  // 0판에 기본값(3억·600만)이 그대로면 넣은 적 없는 것으로 보고 비운다
  {
    const { p, errors } = await page({
      version: 0,
      settings: { ...SETTINGS, totalAssetsEok: 3, incomeMan: 600 },
    });
    await go(p, "/settings");
    const main = await p.locator("main").innerText();
    assert.match(main, /총자산\s+비어 있음/);
    assert.match(main, /월소득\s+비어 있음/);
    assert.deepEqual(errors, []);
  }
  // 깨진 값이어도 화면은 뜬다
  {
    const { p, errors } = await page("{not json");
    await go(p, "/");
    assert.ok((await p.locator("main li a").count()) > 0);
    assert.deepEqual(errors, []);
  }
});
