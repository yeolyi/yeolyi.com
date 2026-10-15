// 정음 — 음차 엔진. 브라우저(content script)와 Node(빌드·테스트) 양쪽에서 쓴다.
((root) => {
  

  // ───────── 한글 조합 ─────────
  const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
  const JUNG = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";
  const JONG = [
    "",
    "ㄱ",
    "ㄲ",
    "ㄳ",
    "ㄴ",
    "ㄵ",
    "ㄶ",
    "ㄷ",
    "ㄹ",
    "ㄺ",
    "ㄻ",
    "ㄼ",
    "ㄽ",
    "ㄾ",
    "ㄿ",
    "ㅀ",
    "ㅁ",
    "ㅂ",
    "ㅄ",
    "ㅅ",
    "ㅆ",
    "ㅇ",
    "ㅈ",
    "ㅊ",
    "ㅋ",
    "ㅌ",
    "ㅍ",
    "ㅎ",
  ];

  function compose(s) {
    return String.fromCharCode(
      0xac00 +
        (CHO.indexOf(s.c) * 21 + JUNG.indexOf(s.v)) * 28 +
        JONG.indexOf(s.j || ""),
    );
  }
  function decompose(ch) {
    const n = ch.charCodeAt(0) - 0xac00;
    if (n < 0 || n > 11171) return null;
    return {
      c: CHO[Math.floor(n / 588)],
      v: JUNG[Math.floor((n % 588) / 28)],
      j: JONG[n % 28],
    };
  }

  const Y_OF = {
    ㅏ: "ㅑ",
    ㅐ: "ㅒ",
    ㅓ: "ㅕ",
    ㅔ: "ㅖ",
    ㅗ: "ㅛ",
    ㅜ: "ㅠ",
    ㅡ: "ㅠ",
    ㅣ: "ㅣ",
  };
  const W_OF = {
    ㅏ: "ㅘ",
    ㅐ: "ㅙ",
    ㅓ: "ㅝ",
    ㅔ: "ㅞ",
    ㅗ: "ㅝ",
    ㅜ: "ㅜ",
    ㅡ: "ㅜ",
    ㅣ: "ㅟ",
  };
  const UNY = { ㅑ: "ㅏ", ㅒ: "ㅐ", ㅕ: "ㅓ", ㅖ: "ㅔ", ㅛ: "ㅗ", ㅠ: "ㅜ" };

  // ───────── 영어: 발음기호(ARPAbet) → 한글 ─────────
  const VOWEL = {
    AA: ["ㅏ"],
    AE: ["ㅐ"],
    AH: ["ㅓ"],
    AO: ["ㅗ"],
    AW: ["ㅏ", "ㅜ"],
    AY: ["ㅏ", "ㅣ"],
    EH: ["ㅔ"],
    ER: ["ㅓ"],
    EY: ["ㅔ", "ㅣ"],
    IH: ["ㅣ"],
    IY: ["ㅣ"],
    OW: ["ㅗ"],
    OY: ["ㅗ", "ㅣ"],
    UH: ["ㅜ"],
    UW: ["ㅜ"],
  };
  const SHORT = new Set(["AE", "EH", "IH", "UH", "AH", "AA"]);
  const ONSET = {
    P: "ㅍ",
    B: "ㅂ",
    T: "ㅌ",
    D: "ㄷ",
    K: "ㅋ",
    G: "ㄱ",
    F: "ㅍ",
    V: "ㅂ",
    TH: "ㅅ",
    DH: "ㄷ",
    S: "ㅅ",
    Z: "ㅈ",
    SH: "ㅅ",
    ZH: "ㅈ",
    CH: "ㅊ",
    JH: "ㅈ",
    HH: "ㅎ",
    M: "ㅁ",
    N: "ㄴ",
    NG: "ㅇ",
    L: "ㄹ",
    R: "ㄹ",
  };
  // 모음 없이 홀로 남은 자음
  const LONE = { SH: "ㅣ", ZH: "ㅣ", CH: "ㅣ", JH: "ㅣ" };
  const CODA_SONORANT = { M: "ㅁ", N: "ㄴ", NG: "ㅇ", L: "ㄹ" };
  const CODA_STOP = { P: "ㅂ", T: "ㅅ", K: "ㄱ" };
  const OBSTRUENT = new Set([
    "P",
    "B",
    "T",
    "D",
    "K",
    "G",
    "F",
    "V",
    "S",
    "Z",
    "TH",
    "DH",
    "SH",
    "ZH",
    "CH",
    "JH",
    "HH",
  ]);

  function isVowel(p) {
    return p && VOWEL[p.replace(/\d/, "")] !== undefined;
  }
  function base(p) {
    return p.replace(/\d/, "");
  }

  // 철자의 모음 글자 묶음을 발음기호의 모음과 짝짓는다(개수가 맞을 때만).
  // 약하게 읽히는 모음(schwa)을 철자대로 적어 '폴리티컬', '토픽'처럼 굳은 표기에 가깝게 만든다.
  function letterVowels(sp, n) {
    let w = sp.replace(/[^a-z]/g, "");
    if (/[^aeiouy]e$/.test(w) && !/[^aeiou]le$/.test(w) && w.length > 3)
      w = w.slice(0, -1);
    w = w.replace(/^y(?=[aeiou])/, "_");
    const groups = [];
    const re = /[aeiouy]+/g;
    let m;
    while ((m = re.exec(w)))
      groups.push({
        g: m[0],
        at: m.index,
        rest: w.slice(m.index + m[0].length),
        before: w.slice(0, m.index),
      });
    if (groups.length !== n) return null;
    groups.forEach((x, k) => {
      x.first = k === 0;
      x.lastG = k === groups.length - 1;
    });
    return groups;
  }

  function spelledVowel(b, stress, lv) {
    if (!lv) return null;
    const { g, rest, before, first, lastG } = lv;
    if (b === "AH" && stress === "0") {
      if (g === "a") {
        if (before === "" || (/^ge?/.test(rest) && /^g/.test(rest)))
          return null;
        if (lastG && /^(l|ls|n|ns|nt|nts|nc|nce|nces|nd|t|ts)$/.test(rest))
          return null;
        if (/^ll/.test(rest)) return "ㅗ"; // installation → 인스톨레이션
        return "ㅏ";
      }
      if (g === "e") {
        if (lastG && /^(n|ns|nt|nts|nc|nce|nces|ss|sses|r|rs|s|d)$/.test(rest))
          return null;
        if (/^(the|me|we|be)$/.test(before + g)) return null;
        return "ㅔ";
      }
      if (g === "o") {
        if (first && /^(c|t)$/.test(before) && before !== "") return null;
        if (lastG && /d$/.test(before) && /^(n|ns)$/.test(rest)) return null;
        if (lastG && /^(m|ms)$/.test(rest)) return null; // custom → 커스텀, bottom → 바텀
        return "ㅗ";
      }
      if (g === "i" || g === "y") return "ㅣ";
      return null;
    }
    if (b === "ER" && stress === "0" && g === "o" && /^r/.test(rest) && !lastG)
      return "ㅗ";
    if (b === "AA" && g === "o") return "ㅗ";
    return null;
  }

  function phonemesToHangul(phones, spelling) {
    const ps = phones.map((p) => p.toUpperCase());
    const out = []; // {c,v,j}
    const sp = (spelling || "").toLowerCase().replace(/'s$/, "");
    const lvs = sp
      ? letterVowels(sp, ps.filter((p) => isVowel(p)).length)
      : null;
    let vowelOrd = 0;
    let i = 0;
    const last = () => out[out.length - 1];

    while (i < ps.length) {
      const p = base(ps[i]);
      const nx = ps[i + 1] ? base(ps[i + 1]) : null;
      const nx2 = ps[i + 2] ? base(ps[i + 2]) : null;

      if (isVowel(ps[i])) {
        pushVowel("ㅇ", ps[i], i, null);
        i++;
        continue;
      }

      // 활음 Y / W
      if (p === "Y" || p === "W") {
        if (nx && isVowel(ps[i + 1])) {
          pushVowel("ㅇ", ps[i + 1], i + 1, p);
          i += 2;
        } else {
          out.push({ c: "ㅇ", v: p === "Y" ? "ㅣ" : "ㅜ", j: "" });
          i++;
        }
        continue;
      }

      // 어말 TS / DZ → 츠 / 즈
      if ((p === "T" && nx === "S") || (p === "D" && nx === "Z")) {
        if (i + 2 === ps.length) {
          out.push({ c: p === "T" ? "ㅊ" : "ㅈ", v: "ㅡ", j: "" });
          i += 2;
          continue;
        }
      }

      // 자음 + 모음
      if (nx && isVowel(ps[i + 1])) {
        if (p === "L" && out.length && !last().j && i > 0) last().j = "ㄹ";
        if (p === "NG") {
          // 앞 음절 받침 ㅇ + 다음 모음은 ㅇ 초성
          if (out.length && !last().j) last().j = "ㅇ";
          i++;
          continue;
        }
        pushVowel(ONSET[p], ps[i + 1], i + 1, p === "SH" ? "SHY" : null, p);
        i += 2;
        continue;
      }

      // 자음 + Y/W + 모음
      if ((nx === "Y" || nx === "W") && nx2 && isVowel(ps[i + 2])) {
        if (nx === "Y" || ["K", "G", "HH"].includes(p)) {
          if (p === "L" && out.length && !last().j) last().j = "ㄹ";
          pushVowel(ONSET[p], ps[i + 2], i + 2, nx, p);
          i += 3;
          continue;
        }
      }

      // 모음 없는 자음
      const prevIdx = i - 1;
      const prevVowel =
        prevIdx >= 0 && isVowel(ps[prevIdx]) ? base(ps[prevIdx]) : null;
      const L = last();
      if (CODA_SONORANT[p] && L && !L.j && i > 0) {
        L.j = CODA_SONORANT[p];
        i++;
        continue;
      }
      if (p === "R") {
        // 모음 뒤 R 은 묵음, 자음 뒤면 '르'
        if (!prevVowel && i > 0 && !isVowel(ps[prevIdx]))
          out.push({ c: "ㄹ", v: "ㅡ", j: "" });
        else if (i === 0) out.push({ c: "ㄹ", v: "ㅡ", j: "" });
        i++;
        continue;
      }
      if (
        CODA_STOP[p] &&
        prevVowel &&
        SHORT.has(prevVowel) &&
        L &&
        !L.j &&
        L._single &&
        (nx === null || OBSTRUENT.has(nx))
      ) {
        L.j = CODA_STOP[p];
        if (L._aao) L.v = "ㅏ"; // hot → 핫, box → 박스, doctor → 닥터
        i++;
        continue;
      }
      if (p === "SH" && nx && !isVowel(ps[i + 1])) {
        // shrimp → 슈림프
        out.push({ c: "ㅅ", v: "ㅠ", j: "" });
        i++;
        continue;
      }
      if (CODA_SONORANT[p]) {
        // 첫머리의 M/N/L 등
        out.push({ c: ONSET[p], v: "ㅡ", j: "" });
        i++;
        continue;
      }
      out.push({ c: ONSET[p] || "ㅇ", v: LONE[p] || "ㅡ", j: "" });
      i++;
    }

    function pushVowel(onset, vp, vi, glide, cons) {
      const b = base(vp);
      const parts = VOWEL[b].slice();
      let v = parts[0];
      const stress = (vp.match(/\d/) || [""])[0];
      const lv = lvs && lvs[vowelOrd];
      vowelOrd++;
      const sv = spelledVowel(b, stress, lv);
      let fromAAo = false;
      if (sv) {
        fromAAo = b === "AA";
        v = sv;
      }
      // 약모음 + 어말 L/N: -le → 을, -ton/-den/-son → 은
      if (b === "AH" && /0/.test(vp)) {
        const after = ps[vi + 1] ? base(ps[vi + 1]) : null;
        const end = vi + 2 === ps.length;
        if (after === "L" && end && /le$/.test(sp)) v = "ㅡ";
        if (
          after === "N" &&
          end &&
          ["T", "D", "S", "Z"].includes(cons) &&
          /(on|en)$/.test(sp)
        )
          v = "ㅡ";
      }
      if (glide === "Y") v = Y_OF[v] || v;
      else if (glide === "W") v = W_OF[v] || v;
      else if (glide === "SHY" && v !== "ㅣ") v = Y_OF[v] || v;
      const syl = {
        c: onset,
        v,
        j: "",
        _single: parts.length === 1,
        _aao: fromAAo,
      };
      out.push(syl);
      for (let k = 1; k < parts.length; k++)
        out.push({ c: "ㅇ", v: parts[k], j: "" });
      // ER + 모음 → R 을 다음 초성으로
      if (b === "ER" && ps[vi + 1] && isVowel(ps[vi + 1])) {
        ps.splice(vi + 1, 0, "R");
      }
    }

    return out.map(compose).join("");
  }

  // ───────── 영어: 철자 → 대략의 발음기호(사전에 없는 단어용) ─────────
  const G2P = [
    [/^kn/, ["N"]],
    [/^wr/, ["R"]],
    [/^wh/, ["W"]],
    [/^ps/, ["S"]],
    [/^tion/, ["SH", "AH0", "N"]],
    [/^sion/, ["ZH", "AH0", "N"]],
    [/^ture/, ["CH", "ER0"]],
    [/^igh/, ["AY1"]],
    [/^tch/, ["CH"]],
    [/^dge/, ["JH"]],
    [/^sch/, ["SH"]],
    [/^ph/, ["F"]],
    [/^th/, ["TH"]],
    [/^sh/, ["SH"]],
    [/^ch/, ["CH"]],
    [/^ck/, ["K"]],
    [/^ng/, ["NG"]],
    [/^qu/, ["K", "W"]],
    [/^gh/, []],
    [/^x/, ["K", "S"]],
    [/^ee/, ["IY1"]],
    [/^ea/, ["IY1"]],
    [/^oo/, ["UW1"]],
    [/^ou/, ["AW1"]],
    [/^ow$/, ["OW1"]],
    [/^ow/, ["AW1"]],
    [/^ai/, ["EY1"]],
    [/^ay/, ["EY1"]],
    [/^ei/, ["EY1"]],
    [/^ey$/, ["IY0"]],
    [/^oi/, ["OY1"]],
    [/^oy/, ["OY1"]],
    [/^au/, ["AO1"]],
    [/^aw/, ["AO1"]],
    [/^ie$/, ["IY0"]],
    [/^ue$/, ["UW1"]],
    [/^oa/, ["OW1"]],
    [/^eu/, ["Y", "UW1"]],
    [/^ew/, ["Y", "UW1"]],
    [/^er$/, ["ER0"]],
    [/^er(?![aeiouy])/, ["ER1"]],
    [/^ir(?![aeiouy])/, ["ER1"]],
    [/^ur(?![aeiouy])/, ["ER1"]],
    [/^ar(?![aeiouy])/, ["AA1"]],
    [/^or(?![aeiouy])/, ["AO1"]],
  ];
  const CONS1 = {
    b: "B",
    c: "K",
    d: "D",
    f: "F",
    g: "G",
    h: "HH",
    j: "JH",
    k: "K",
    l: "L",
    m: "M",
    n: "N",
    p: "P",
    q: "K",
    r: "R",
    s: "S",
    t: "T",
    v: "V",
    w: "W",
    z: "Z",
  };
  const SHORTV = { a: "AE1", e: "EH1", i: "IH1", o: "AA1", u: "AH1" };
  const LONGV = {
    a: ["EY1"],
    e: ["IY1"],
    i: ["AY1"],
    o: ["OW1"],
    u: ["Y", "UW1"],
  };

  function spellToPhones(word) {
    let w = word.toLowerCase().replace(/[^a-z]/g, "");
    const ps = [];
    if (!w) return ps;
    // 어말 -le (자음 뒤)
    let tailLe = false;
    if (/[^aeiou]le$/.test(w) && w.length > 3) {
      tailLe = true;
      w = w.slice(0, -2);
    }
    // 장모음 마법의 e: a_e, i_e, o_e, u_e
    let magic = -1;
    const m = w.match(/([aeiou])([^aeiouwxy])e$/);
    if (m && w.length > 3) {
      magic = w.length - 3;
      w = w.slice(0, -1);
    } else if (/[^aeiou]e$/.test(w) && w.length > 3) w = w.slice(0, -1);

    let i = 0;
    while (i < w.length) {
      const rest = w.slice(i);
      let hit = null;
      for (const [re, out] of G2P) {
        const mm = rest.match(re);
        if (mm && !(re.source.startsWith("^ow$") && false)) {
          hit = [mm[0].length, out];
          break;
        }
      }
      if (hit) {
        ps.push(...hit[1]);
        i += hit[0];
        continue;
      }
      const ch = w[i];
      const nx = w[i + 1];
      if (ch === nx && !"aeiou".includes(ch)) {
        i++;
        continue;
      } // 겹자음
      if ("aeiou".includes(ch)) {
        if (i === magic) ps.push(...LONGV[ch]);
        else if (ch === "e" && i === w.length - 1 && w.length > 2) {
          /* 묵음 */
        } else if (ch === "i" && "aeou".includes(nx || "")) ps.push("IY1");
        else if (ch === "a" && i === w.length - 1) ps.push("AH0");
        else if (ch === "o" && i === w.length - 1) ps.push("OW1");
        else if (ch === "u" && i === w.length - 1) ps.push("UW1");
        else ps.push(SHORTV[ch]);
        i++;
        continue;
      }
      if (ch === "y") {
        if (i === 0 && nx && "aeiou".includes(nx)) ps.push("Y");
        else if (i === w.length - 1) ps.push(w.length <= 3 ? "AY1" : "IY0");
        else ps.push("IH1");
        i++;
        continue;
      }
      if (ch === "c") {
        ps.push(nx && "eiy".includes(nx) ? "S" : "K");
        i++;
        continue;
      }
      if (ch === "g") {
        ps.push(nx && "eiy".includes(nx) && i > 0 ? "JH" : "G");
        i++;
        continue;
      }
      if (
        ch === "s" &&
        i > 0 &&
        "aeiou".includes(w[i - 1]) &&
        nx &&
        "aeiou".includes(nx)
      ) {
        ps.push("Z");
        i++;
        continue;
      }
      ps.push(CONS1[ch] || "");
      i++;
    }
    if (tailLe) ps.push("AH0", "L");
    return ps.filter(Boolean);
  }

  // ───────── 영어 단어 ─────────
  const LETTER = {
    A: "에이",
    B: "비",
    C: "씨",
    D: "디",
    E: "이",
    F: "에프",
    G: "지",
    H: "에이치",
    I: "아이",
    J: "제이",
    K: "케이",
    L: "엘",
    M: "엠",
    N: "엔",
    O: "오",
    P: "피",
    Q: "큐",
    R: "알",
    S: "에스",
    T: "티",
    U: "유",
    V: "브이",
    W: "더블유",
    X: "엑스",
    Y: "와이",
    Z: "지",
  };

  function spellLetters(w) {
    return w
      .toUpperCase()
      .split("")
      .map((c) => LETTER[c] || "")
      .join("");
  }

  function latinWord(word, dict) {
    const plain = word.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/’/g, "'");
    const lower = plain.toLowerCase();
    if (/^[A-Z]{2,5}$/.test(plain)) {
      const d = dict && dict.get(lower);
      if (!(plain.length >= 4 && d && /[AEIOU]/.test(plain)))
        return spellLetters(plain);
      return d;
    }
    if (/^[A-Za-z]$/.test(plain))
      return /^[Aa]$/.test(plain) && plain === "a"
        ? "어"
        : LETTER[plain.toUpperCase()];
    const d = dict && dict.get(lower);
    if (d) return d;
    // 소유격·축약
    const ap = lower.match(/^(.+)'(s|re|ll|ve|d|t|m)$/);
    if (ap && dict && dict.get(ap[1])) {
      const tail = {
        s: "스",
        re: "어",
        ll: "ㄹ",
        ve: "브",
        d: "드",
        t: "트",
        m: "ㅁ",
      }[ap[2]];
      return attachTail(dict.get(ap[1]), tail);
    }
    // CamelCase 쪼개기
    const parts = plain.match(/[A-Z]{2,}(?=[A-Z][a-z])|[A-Z]?[a-z]+|[A-Z]+/g);
    if (parts && parts.length > 1)
      return parts.map((p) => latinWord(p, dict)).join("");
    // 흔한 접미사: 사전 단어 + s / ing / ed
    if (dict) {
      for (const [suf, tail] of [
        ["ing", "잉"],
        ["s", "스"],
        ["es", "스"],
        ["ed", "드"],
        ["er", "어"],
        ["ly", "리"],
      ]) {
        if (lower.endsWith(suf) && lower.length > suf.length + 2) {
          const stem = lower.slice(0, -suf.length);
          const sd = dict.get(stem) || dict.get(stem + "e");
          if (sd) return sd + tail;
        }
      }
    }
    return phonemesToHangul(spellToPhones(lower), lower);
  }

  function attachTail(word, tail) {
    if (tail.length === 1 && /[ㄱ-ㅎ]/.test(tail)) {
      const lastCh = word[word.length - 1];
      const d = decompose(lastCh);
      if (d && !d.j) return word.slice(0, -1) + compose({ ...d, j: tail });
      return word;
    }
    return word + tail;
  }

  // ───────── 일본어 가나 ─────────
  // [첫소리일 때, 가운데일 때]
  const KANA = {};
  const kanaRows = [
    ["あいうえお", "아이우에오"],
    ["かきくけこ", "가기구게고", "카키쿠케코"],
    ["がぎぐげご", "가기구게고"],
    ["さしすせそ", "사시스세소"],
    ["ざじずぜぞ", "자지즈제조"],
    ["たちつてと", "다지쓰데도", "타치쓰테토"],
    ["だぢづでど", "다지즈데도"],
    ["なにぬねの", "나니누네노"],
    ["はひふへほ", "하히후헤호"],
    ["ばびぶべぼ", "바비부베보"],
    ["ぱぴぷぺぽ", "파피푸페포"],
    ["まみむめも", "마미무메모"],
    ["やゆよ", "야유요"],
    ["らりるれろ", "라리루레로"],
    ["わゐゑを", "와이에오"],
    ["ゔ", "부"],
    ["ぁぃぅぇぉ", "아이우에오"],
    ["ゃゅょゎ", "야유요와"],
  ];
  for (const [k, a, b] of kanaRows)
    for (let i = 0; i < k.length; i++) KANA[k[i]] = [a[i], (b || a)[i]];
  const YOON = { ゃ: "ㅑ", ゅ: "ㅠ", ょ: "ㅛ" };
  const SMALLV = { ぁ: "ㅏ", ぃ: "ㅣ", ぅ: "ㅜ", ぇ: "ㅔ", ぉ: "ㅗ" };

  function toHira(ch) {
    const c = ch.charCodeAt(0);
    return c >= 0x30a1 && c <= 0x30f6 ? String.fromCharCode(c - 0x60) : ch;
  }

  function kanaRun(s) {
    const out = [];
    let first = true;
    const chars = [...s].map(toHira);
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const nx = chars[i + 1];
      if (ch === "ん") {
        attachJong(out, "ㄴ");
        continue;
      }
      if (ch === "っ") {
        attachJong(out, "ㅅ");
        continue;
      }
      if (ch === "ー" || ch === "〜") continue;
      const k = KANA[ch];
      if (!k) {
        out.push(ch);
        continue;
      }
      let syl = k[first ? 0 : 1];
      first = false;
      if (nx && YOON[nx]) {
        // きゃ → 갸/캬, しゃ → 샤, ちゃ → 자/차
        const d = decompose(syl);
        let v = YOON[nx];
        if ("ㅈㅊ".includes(d.c)) v = UNY[v];
        syl = compose({ c: d.c, v, j: "" });
        i++;
      } else if (nx && SMALLV[nx] && ch !== "っ") {
        // ファ, ティ, ウィ, シェ
        const d = decompose(syl);
        let v = SMALLV[nx];
        if (d.c === "ㅇ" && "うゔ".includes(ch)) v = W_OF[v];
        if (ch === "ふ") d.c = "ㅍ"; // ファ 파, フィ 피, フェ 페, フォ 포
        if (d.c === "ㅅ" && d.v === "ㅣ" && v === "ㅔ") v = "ㅖ";
        if ((ch === "と" || ch === "ど") && v === "ㅜ") v = "ㅜ";
        syl = compose({ c: d.c, v, j: "" });
        i++;
      }
      out.push(syl);
    }
    return out.join("");
  }

  function attachJong(out, j) {
    const lastCh = out[out.length - 1];
    const d = lastCh && decompose(lastCh);
    if (d && !d.j) out[out.length - 1] = compose({ ...d, j });
  }

  // ───────── 한자 (중국어 병음 / 한국 한자음) ─────────
  const CJK_START = 0x4e00;

  // ───────── 숫자 ─────────
  const DIG = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
  function under10k(n) {
    let s = "";
    const units = ["천", "백", "십", ""];
    const ds = String(n).padStart(4, "0");
    for (let i = 0; i < 4; i++) {
      const d = +ds[i];
      if (!d) continue;
      s += (d === 1 && i < 3 ? "" : DIG[d]) + units[i];
    }
    return s;
  }
  function readNumber(str) {
    const [intPart, frac] = str.replace(/,/g, "").split(".");
    let n = intPart.replace(/^0+(?=\d)/, "");
    let s = "";
    if (/^0+$/.test(n)) s = "영";
    else if (n.length > 20)
      return [...str]
        .map((c) => (c === "." ? "점" : c === "," ? "" : DIG[+c] || "영"))
        .join("");
    else {
      const big = ["", "만", "억", "조", "경"];
      let k = 0;
      while (n.length) {
        const chunk = +n.slice(-4);
        n = n.slice(0, -4);
        if (chunk)
          s =
            (chunk === 1 && k === 1 && !n ? "" : under10k(chunk)) + big[k] + s;
        k++;
      }
    }
    if (frac) s += "점" + [...frac].map((c) => DIG[+c] || "영").join("");
    return s;
  }

  // ───────── 문자열 전체 ─────────
  const KANA_RE = /[ぁ-ゖァ-ヺー]/;
  const TOKEN =
    /([A-Za-zÀ-ɏ]+(?:['’][A-Za-zÀ-ɏ]+)*)|([ぁ-ゖァ-ヺー]+)|([一-鿿]+)|(\d[\d,]*(?:\.\d+)?)/g;

  function createConverter(data) {
    const dict = data.en || new Map();
    const zh = data.zh || "";
    const ko = data.ko || "";
    const cache = new Map();

    function hanzi(run, mode) {
      const table = mode === "zh" ? zh : ko;
      let s = "";
      for (const ch of run) {
        const idx = ch.codePointAt(0) - CJK_START;
        const r = table && table[idx];
        s += r && r !== "?" ? r : ch;
      }
      return s;
    }

    return function convert(text, opts) {
      opts = opts || {};
      const hanMode = opts.hanMode || (KANA_RE.test(text) ? "ko" : "zh");
      return text.replace(TOKEN, (m, latin, kana, han, num) => {
        if (latin) {
          let r = cache.get(latin);
          if (r === undefined) {
            r = latinWord(latin, dict);
            cache.set(latin, r);
          }
          return r;
        }
        if (kana) return kanaRun(kana);
        if (han) return hanzi(han, hanMode);
        if (num) return opts.numbers ? readNumber(num) : num;
        return m;
      });
    };
  }

  const api = {
    createConverter,
    phonemesToHangul,
    spellToPhones,
    latinWord,
    kanaRun,
    readNumber,
    compose,
    decompose,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MonttangEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
