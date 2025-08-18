/**
 * dunnet (Emacs 내장 텍스트 어드벤처) 브라우저/TypeScript 포팅
 * -----------------------------------------------------------------------------
 * 원작: GNU Emacs의 dunnet.el (Ron Schnell, 1992-2017)
 * 라이선스: GNU GPL v3 이상 (원작과 동일)
 * 포팅: 브라우저 환경용 단일 TS 파일. HTML에서 script로 포함해 데모 가능.
 *
 * [중요 변경 - 브라우저 이식 메모]
 * - 파일/로그:
 *   - 점수 로그 파일(/usr/local/dunnet.score) 기능 제거. (브라우저 파일 권한 부재)
 *   - save/restore는 localStorage에 JSON 저장으로 대체. (키: "dunnet-save:<이름>")
 * - Emacs UI/키맵/윈도우 스크롤: 제거. DOM 프린트로 대체.
 * - 네트워크/시스템:
 *   - ftp/rlogin/ssh/unix/dos 인터페이스는 '게임 퍼즐 동작/메시지' 중심으로 시뮬레이트.
 *   - 시간 지연(sleep) 제거. (메시지 출력만)
 * - 입력은 영어, 출력은 한국어. 오브젝트 표기는 "한국어(영어키워드)".
 * - 원작 로직을 가능한 한 동일하게 유지. (방 구조/미로/특수 이동/퍼즐/사우나/버스/폭발/엔드게임 등)
 *
 * [플레이 방법 요약(한국어)]
 * - 방향: n,s,e,w,ne,se,nw,sw,up,down,in,out (약어 허용)
 * - 기본: look/x/examine, inventory/i, take/get, drop, put A in B, dig, eat,
 *         press/push, turn dial clockwise, climb, shake, break, swim,
 *         sleep, piss/urinate, flush, score, help, quit
 * - VAX 콘솔: 컴퓨터실에서 'type' => 유닉스 셸($). 'exit'로 나옴.
 * - PC: PC 구역에서 'reset' => DOS 프롬프트(A>). 'exit'로 나옴.
 * - 저장/복구: save <name>, restore <name>
 * - 엔드게임 질문 방: answer <정답>
 *
 * ※ 영어 명령/오브젝트 키워드가 필요할 때, 화면에는 한국어(영어)로 보여줍니다.
 */

// DOM 연결(아주 단순)
const $out = document.getElementById("out") as HTMLDivElement;
const $cmd = document.getElementById("cmd") as HTMLInputElement;
const $send = document.getElementById("send") as HTMLButtonElement;

// 간단 유틸
const println = (s: string = "") => {
  $out.innerText += s + "\n";
  $out.scrollTop = $out.scrollHeight;
};
const printDOM = (s: string = "") => {
  $out.innerText += s;
  $out.scrollTop = $out.scrollHeight;
};

// 모드
type Mode = "dungeon" | "unix" | "dos";
type Dir = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
const enum DIR {
  N = 0,
  S = 1,
  E = 2,
  W = 3,
  NE = 4,
  SE = 5,
  NW = 6,
  SW = 7,
  UP = 8,
  DOWN = 9,
  IN = 10,
  OUT = 11,
}

// 오브젝트 번호 (원작과 동일 인덱스 유지)
// 0~27: 귀중품/휴대 가능, 음수: 영구/비가변(혹은 특수), 255: obj-special
// 몇 개가 빠졌다?
const OBJ = {
  shovel: 0,
  lamp: 1,
  cpu: 2,
  food: 3,
  key: 4,
  paper: 5,
  rms: 6,
  diamond: 7,
  weight: 8,
  life: 9,
  bracelet: 10,
  gold: 11,
  platinum: 12,
  towel: 13,
  axe: 14,
  silver: 15,
  license: 16,
  coins: 17,
  egg: 18,
  jar: 19,
  bone: 20,
  nitric: 21,
  glycerine: 22,
  ruby: 23,
  amethyst: 24,
  mona: 25,
  bill: 26,
  floppy: 27,

  // 음수(고정/특수)
  boulder: -1,
  tree: -2,
  bear: -3,
  bin: -4,
  cabinet: -5,
  protoplasm: -6,
  dial: -7,
  button: -8,
  chute: -9,
  painting: -10,
  bed: -11,
  urinal: -12,
  URINE: -13,
  pipes: -14,
  box: -15,
  cable: -16,
  mail: -17,
  bus: -18,
  gate: -19,
  cliff: -20,
  skeleton: -21,
  fish: -22,
  tanks: -23,
  swtch: -24,
  blackboard: -25,
  disposal: -26,
  ladder: -27,
  subway: -28,
  pc: -29,
  coconut: -30 /* -31 없음 */,
  lake: -32,
  special: 255,
} as const;
type ObjId = number;

// 방 인덱스 (원작 순서대로)
const RM = {
  treasure: 0,
  dead_end: 1,
  ew_dirt: 2,
  fork: 3,
  ne_sw: 4,
  building_front: 5,
  se_nw: 6,
  bear_hangout: 7,
  old_hall: 8,
  mailroom: 9,
  computer_room: 10,
  meadow: 11,
  receiving_room: 12,
  nb_hall: 13,
  sauna: 14,
  end_ns_hall: 15,
  weight_room: 16,
  maze_button: 17,
  maze18: 18,
  maze19: 19,
  maze20: 20,
  maze21: 21,
  maze22: 22,
  reception: 23,
  health_front: 24,
  lake_n: 25,
  lake_s: 26,
  hidden: 27,
  cave_entr: 28,
  misty: 29,
  cave_ew: 30,
  nsw_junc: 31,
  north_cave: 32,
  south_cave: 33,
  bedroom: 34,
  bathroom: 35,
  urinal: 36,
  ne_end: 37,
  junction: 38,
  sw_end: 39,
  east_end: 40,
  west_end: 41,
  horseshoe: 42,
  empty43: 43,
  blue44: 44,
  yellow45: 45,
  red46: 46,
  long_ns: 47,
  three_q_n: 48,
  north_end_long: 49,
  three_q_s: 50,
  south_end_long: 51,
  stair_landing: 52,
  updown: 53,
  top_stair: 54,
  ne_crawl: 55,
  small_crawl: 56,
  gamma: 57,
  post_office: 58,
  main_maple: 59,
  main_oak: 60,
  main_vermont: 61,
  main_sycamore: 62,
  first_maple: 63,
  first_oak: 64,
  first_vermont: 65,
  first_sycamore: 66,
  second_maple: 67,
  second_oak: 68,
  second_vermont: 69,
  second_sycamore: 70,
  third_maple: 71,
  third_oak: 72,
  third_vermont: 73,
  third_sycamore: 74,
  fourth_maple: 75,
  fourth_oak: 76,
  fourth_vermont: 77,
  fourth_sycamore: 78,
  fifth_maple: 79,
  fifth_oak: 80,
  fifth_vermont: 81,
  fifth_sycamore: 82,
  museum_entr: 83,
  museum_lobby: 84,
  geological: 85,
  marine: 86,
  maint: 87,
  classroom: 88,
  vermont_station: 89,
  museum_station: 90,
  ns_tunnel: 91,
  north_ns_tunnel: 92,
  top_subway: 93,
  bot_subway: 94,
  endgame_computer: 95,
  end_ns_96: 96,
  q1: 97,
  end_ns_98: 98,
  q2: 99,
  end_ns_100: 100,
  q3: 101,
  end_treasure: 102,
  winner: 103,
  pc_area: 104,
} as const;
type RoomId = number;

// 무작위: 달걀 위치(tloc 60~77 중 하나), 금고 조합 코드(100~999)
const randInt = (a: number, b: number) =>
  a + Math.floor(Math.random() * (b - a + 1));

// 무시 단어
const IGNORE = new Set(["the", "to", "at"]);

// 문자열 유틸
const lower = (s: string) => s.toLowerCase();
const tokenize = (line: string) =>
  line
    .trim()
    .toLowerCase()
    .split(/[ ,:;]+/)
    .filter(Boolean);

// 한영 표기 헬퍼: 화면에는 한국어(영문키)
const ko = {
  objName(o: ObjId) {
    switch (o) {
      case OBJ.shovel:
        return "삽(shovel)";
      case OBJ.lamp:
        return "램프(lamp)";
      case OBJ.cpu:
        return "CPU 보드(cpu)";
      case OBJ.food:
        return "음식(food)";
      case OBJ.key:
        return "열쇠(key)";
      case OBJ.paper:
        return "종이쪼가리(paper)";
      case OBJ.rms:
        return "RMS 석고상(rms statuette)";
      case OBJ.diamond:
        return "다이아몬드(diamond)";
      case OBJ.weight:
        return "무게추(weight)";
      case OBJ.life:
        return "구명조끼(life preserver)";
      case OBJ.bracelet:
        return "에메랄드 팔찌(bracelet)";
      case OBJ.gold:
        return "금괴(gold bar)";
      case OBJ.platinum:
        return "백금괴(platinum bar)";
      case OBJ.towel:
        return "수건(towel)";
      case OBJ.axe:
        return "도끼(axe)";
      case OBJ.silver:
        return "은괴(silver bar)";
      case OBJ.license:
        return "버스 운전면허(license)";
      case OBJ.coins:
        return "귀중한 동전(coins)";
      case OBJ.egg:
        return "보석 달걀(egg)";
      case OBJ.jar:
        return "유리병(jar)";
      case OBJ.bone:
        return "공룡 뼈(bone)";
      case OBJ.nitric:
        return "질산(nitric acid)";
      case OBJ.glycerine:
        return "글리세린(glycerine)";
      case OBJ.ruby:
        return "루비(ruby)";
      case OBJ.amethyst:
        return "자수정(amethyst)";
      case OBJ.mona:
        return "모나리자(Mona Lisa)";
      case OBJ.bill:
        return "100달러 지폐($100 bill)";
      case OBJ.floppy:
        return "플로피 디스크(floppy)";
      // 고정물
      case OBJ.boulder:
        return "큰 바위(boulder)";
      case OBJ.tree:
        return "야자수(tree)";
      case OBJ.bear:
        return "곰(bear)";
      case OBJ.bin:
        return "우편함(bin)";
      case OBJ.cabinet:
        return "컴퓨터 캐비닛(cabinet/computer)";
      case OBJ.protoplasm:
        return "걸죽한 원형질(protoplasm)";
      case OBJ.dial:
        return "다이얼(dial)";
      case OBJ.button:
        return "버튼(button)";
      case OBJ.chute:
        return "슈트(chute)";
      case OBJ.painting:
        return "그림(painting)";
      case OBJ.bed:
        return "침대(bed)";
      case OBJ.urinal:
        return "소변기(urinal)";
      case OBJ.URINE:
        return "…소변(urine)";
      case OBJ.pipes:
        return "파이프(pipes)";
      case OBJ.box:
        return "열쇠 박스(box)";
      case OBJ.cable:
        return "이더넷 케이블(cable)";
      case OBJ.mail:
        return "우편 투입구(mail drop)";
      case OBJ.bus:
        return "버스(bus)";
      case OBJ.gate:
        return "게이트(gate)";
      case OBJ.cliff:
        return "절벽(cliff)";
      case OBJ.skeleton:
        return "공룡 골격(skeleton)";
      case OBJ.fish:
        return "물고기(fish)";
      case OBJ.tanks:
        return "수족관(tanks)";
      case OBJ.swtch:
        return "스위치(switch)";
      case OBJ.blackboard:
        return "칠판(blackboard)";
      case OBJ.disposal:
        return "쓰레기 처리기(disposal)";
      case OBJ.ladder:
        return "사다리(ladder)";
      case OBJ.subway:
        return "지하철 열차(train)";
      case OBJ.pc:
        return "PC(pc)";
      case OBJ.coconut:
        return "코코넛(coconut)";
      case OBJ.lake:
        return "호수(lake)";
      default:
        return "무언가(object)";
    }
  },
};

// 오브젝트 이름 파서(원작 dun-objnames)
const OBJNAME: Record<string, ObjId> = {
  shovel: 0,
  lamp: 1,
  cpu: 2,
  board: 2,
  card: 2,
  chip: 2,
  food: 3,
  key: 4,
  paper: 5,
  slip: 5,
  rms: 6,
  statue: 6,
  statuette: 6,
  stallman: 6,
  diamond: 7,
  weight: 8,
  life: 9,
  preserver: 9,
  bracelet: 10,
  emerald: 10,
  gold: 11,
  platinum: 12,
  towel: 13,
  beach: 13,
  axe: 14,
  silver: 15,
  license: 16,
  coins: 17,
  egg: 18,
  jar: 19,
  bone: 20,
  acid: 21,
  nitric: 21,
  glycerine: 22,
  ruby: 23,
  amethyst: 24,
  mona: 25,
  bill: 26,
  floppy: 27,
  disk: 27,

  boulder: -1,
  tree: -2,
  trees: -2,
  palm: -2,
  bear: -3,
  bin: -4,
  bins: -4,
  cabinet: -5,
  computer: -5,
  vax: -5,
  ibm: -5,
  protoplasm: -6,
  dial: -7,
  button: -8,
  chute: -9,
  painting: -10,
  bed: -11,
  urinal: -12,
  URINE: -13,
  pipes: -14,
  pipe: -14,
  box: -15,
  slit: -15,
  cable: -16,
  ethernet: -16,
  mail: -17,
  drop: -17,
  bus: -18,
  gate: -19,
  cliff: -20,
  skeleton: -21,
  dinosaur: -21,
  fish: -22,
  tanks: -23,
  tank: -23,
  switch: -24,
  blackboard: -25,
  disposal: -26,
  garbage: -26,
  ladder: -27,
  subway: -28,
  train: -28,
  pc: -29,
  drive: -29,
  coconut: -30,
  coconuts: -30,
  lake: -32,
  water: -32,
};

type Room = { long: string; short: string };

export const ROOMS: Room[] = [
  {
    long: "당신은 보물 방에 있습니다. 북쪽으로 나가는 문이 있습니다.",
    short: "보물 방",
  },
  {
    long: "당신은 흙길의 막다른 곳에 있습니다. 길은 동쪽으로 이어집니다. 멀리서 갈림길이 보입니다. 이곳의 나무들은 매우 키 큰 왕야자이며, 서로 같은 간격으로 서 있습니다.",
    short: "막다른 길",
  },
  {
    long: "당신은 흙길의 연장선 위에 있습니다. 양옆에 나무들이 더 있습니다. 길은 동쪽과 서쪽으로 이어집니다.",
    short: "동/서 흙길",
  },
  {
    long: "당신은 두 개의 통로 갈림길에 있습니다. 하나는 북동쪽으로, 하나는 남동쪽으로 향합니다. 이곳의 땅은 매우 부드러워 보입니다. 서쪽으로 되돌아갈 수도 있습니다.",
    short: "갈림길",
  },
  {
    long: "당신은 북동/남서 방향의 길 위에 있습니다.",
    short: "북동/남서 길",
  },
  {
    long: "당신은 길의 끝에 있습니다. 북동쪽 앞에 건물이 있고, 길은 남서쪽으로 되돌아갑니다.",
    short: "건물 앞",
  },
  {
    long: "당신은 남동/북서 방향의 길 위에 있습니다.",
    short: "남동/북서 길",
  },
  {
    long: "당신은 길의 끝에 서 있습니다. 북서쪽으로 되돌아가는 통로가 있습니다.",
    short: "곰(Bear) 소굴",
  },
  {
    long: "당신은 오래된 건물의 복도에 있습니다. 동쪽과 서쪽에 방이 있고, 북쪽과 남쪽으로 나가는 문이 있습니다.",
    short: "낡은 건물 복도",
  },
  {
    long: "당신은 우편(Mail)실에 있습니다. 보통 우편을 보관하는 많은 상자들이 있습니다. 출구는 서쪽입니다.",
    short: "우편(Mail)실",
  },
  {
    long: "당신은 컴퓨터(Computer) 실에 있습니다. 대부분의 장비는 치워진 듯합니다. 하지만 당신 앞에는 VAX 11/780이 있고, 캐비닛 하나가 활짝 열려 있습니다. 기계 앞의 표지판에는 이렇게 쓰여 있습니다: 이 VAX의 이름은 ‘pokey’입니다. 콘솔에서 타이핑하려면 ‘type’ 명령을 사용하세요. 출구는 동쪽입니다.",
    short: "컴퓨터(Computer) 실",
  },
  {
    long: "당신은 오래된 건물 뒤쪽의 초원에 있습니다. 작은 오솔길이 서쪽으로 나 있고, 남쪽으로는 문이 있습니다.",
    short: "초원",
  },
  {
    long: "당신은 동쪽으로 문이 있는 둥근 석실에 있습니다. 벽에는 ‘receiving room’이라고 적힌 표지판이 있습니다.",
    short: "수취실",
  },
  {
    long: "당신은 북쪽으로 이어지는 복도의 남쪽 끝에 있습니다. 동쪽과 서쪽에 방이 있습니다.",
    short: "북행 복도",
  },
  {
    long: "당신은 사우나에 있습니다. 방에는 벽의 다이얼 하나를 제외하면 아무것도 없습니다. 서쪽으로 나가는 문이 있습니다.",
    short: "사우나",
  },
  {
    long: "당신은 남/북 복도의 끝에 있습니다. 남쪽으로 돌아가거나 동쪽의 방으로 갈 수 있습니다.",
    short: "남/북 복도의 끝",
  },
  {
    long: "당신은 오래된 웨이트(Weight) 룸에 있습니다. 모든 장비는 망가졌거나 완전히 부서졌습니다. 서쪽으로 나가는 문이 있고, 바닥의 구멍으로 내려가는 사다리가 있습니다.",
    short: "웨이트(Weight) 룸",
  },
  {
    long: "당신은 서로 비슷하게 꼬불꼬불한 작은 통로의 미로에 있습니다. 여기 바닥에 버튼(Button)이 하나 있습니다.",
    short: "미로 버튼(Button) 방",
  },
  {
    long: "당신은 서로 비슷한 꼬불꼬불한 작은 통로의 미로에 있습니다.",
    short: "미로",
  },
  {
    long: "당신은 서로 비슷한 목마른 작은 통로의 미로에 있습니다.",
    short: "미로",
  },
  {
    long: "당신은 서로 비슷한 스무 개의 작은 통로의 미로에 있습니다.",
    short: "미로",
  },
  {
    long: "당신은 멍한 상태의 꼬불꼬불한 작은 통로의 미로에 있습니다.",
    short: "미로",
  },
  {
    long: "당신은 서로 비슷한 꼬불꼬불한 작은 양배추의 미로에 있습니다.",
    short: "미로",
  },
  {
    long: "당신은 헬스 & 피트니스 센터의 접수처에 있습니다. 최근 약탈을 당한 듯 아무것도 남지 않았습니다. 남쪽으로 나가는 문과 남동쪽으로 이어지는 기어가는 통로가 있습니다.",
    short: "접수처",
  },
  {
    long: "당신은 북쪽의 큰 건물(예전의 헬스 & 피트니스 센터) 밖에 있습니다. 길은 남쪽으로 이어집니다.",
    short: "헬스클럽 앞",
  },
  {
    long: "당신은 호수(Lake)의 북쪽 기슭에 있습니다. 반대편에는 동굴로 이어지는 길이 보입니다. 물(Water)은 매우 깊어 보입니다.",
    short: "호숫가(Lake) 북쪽",
  },
  {
    long: "당신은 호수(Lake)의 남쪽 기슭에 있습니다. 길이 남쪽으로 이어집니다.",
    short: "호숫가(Lake) 남쪽",
  },
  {
    long: "당신은 길 옆의 잘 숨겨진 지역에 있습니다. 북동쪽 덤불 너머로 곰(Bear) 소굴이 보입니다.",
    short: "숨겨진 지역",
  },
  {
    long: "동굴 입구는 남쪽에 있습니다. 북쪽으로는 깊은 호수(Lake)로 이어지는 길이 있습니다. 근처 땅에는 슈트(Chute)가 있고, ‘여기에 보물을 넣으면 점수를 드립니다’라는 표지판이 있습니다.",
    short: "동굴 입구",
  },
  {
    long: "당신은 산을 파서 만든 안개 낀 습한 방에 있습니다. 북쪽에는 산사태의 흔적이 있습니다. 동쪽에는 어둠 속으로 이어지는 작은 통로가 있습니다.",
    short: "안개 낀 방",
  },
  {
    long: "당신은 동/서 방향의 통로에 있습니다. 이곳의 벽은 여러 색깔의 바위로 이루어져 아주 아름답습니다.",
    short: "동굴 동/서 통로",
  },
  {
    long: "당신은 두 통로의 교차점에 있습니다. 하나는 남/북으로, 다른 하나는 서쪽으로 향합니다.",
    short: "남/북/서 교차로",
  },
  {
    long: "당신은 남/북 통로의 북쪽 끝에 있습니다. 여기서 아래로 내려가는 계단이 있습니다. 또한 서쪽으로 향하는 문도 있습니다.",
    short: "동굴 통로 북쪽 끝",
  },
  {
    long: "당신은 남/북 통로의 남쪽 끝에 있습니다. 바닥에 당신이 아마 들어갈 수 있을 만큼의 구멍이 있습니다.",
    short: "동굴 통로 남쪽 끝",
  },
  {
    long: "당신은 일꾼의 침실로 보이는 곳에 있습니다. 방 중앙에는 퀸사이즈 침대(Bed)가 있고, 벽에는 그림(Painting)이 걸려 있습니다. 남쪽의 다른 방으로 가는 문이 있으며, 위와 아래로 이어지는 계단이 있습니다.",
    short: "침실",
  },
  {
    long: "당신은 동굴의 일꾼용 욕실에 있습니다. 벽에는 소변기(Urinal)가 걸려 있고, 맞은편 벽에는 예전 싱크대가 있던 자리의 드러난 파이프(Pipe)가 보입니다. 북쪽에는 침실이 있습니다.",
    short: "욕실",
  },
  {
    long: "이것은 소변기(Urinal)를 위한 마커입니다. 사용자는 이것을 보지 못하지만, 물건을 담을 수 있는 방입니다.",
    short: "소변기(Urinal)",
  },
  {
    long: "당신은 북동/남서 통로의 북동쪽 끝에 있습니다. 계단이 위로 사라집니다.",
    short: "북동/남서 동굴 통로 북동쪽 끝",
  },
  {
    long: "당신은 북동/남서 통로와 동/서 통로의 교차점에 있습니다.",
    short: "북동/남서-동/서 교차로",
  },
  {
    long: "당신은 북동/남서 통로의 남서쪽 끝에 있습니다.",
    short: "북동/남서 동굴 통로 남서쪽 끝",
  },
  {
    long: "당신은 동/서 통로의 동쪽 끝에 있습니다. 위층으로 이어지는 계단이 있습니다.",
    short: "동/서 동굴 통로 동쪽 끝",
  },
  {
    long: "당신은 동/서 통로의 서쪽 끝에 있습니다. 바닥에는 아래로 이어지는 구멍이 있습니다.",
    short: "동/서 동굴 통로 서쪽 끝",
  },
  {
    long: "당신은 가운데 말굽 모양의 바위(Boulder) 하나만 있는 빈 방에 있습니다. 여기서 아래로 내려가는 계단이 있습니다.",
    short: "말굽 바위(Boulder) 방",
  },
  {
    long: "당신은 아무것도 없는 방에 있습니다. 북쪽과 동쪽으로 나가는 문이 있습니다.",
    short: "빈 방",
  },
  {
    long: "당신은 빈 방에 있습니다. 흥미롭게도 이 방의 돌은 파란색으로 칠해져 있습니다. 동쪽과 남쪽으로 나가는 문이 있습니다.",
    short: "파란 방",
  },
  {
    long: "당신은 빈 방에 있습니다. 흥미롭게도 이 방의 돌은 노란색으로 칠해져 있습니다. 남쪽과 서쪽으로 나가는 문이 있습니다.",
    short: "노란 방",
  },
  {
    long: "당신은 빈 방에 있습니다. 흥미롭게도 이 방의 돌은 빨간색으로 칠해져 있습니다. 서쪽과 북쪽으로 나가는 문이 있습니다.",
    short: "빨간 방",
  },
  {
    long: "당신은 긴 남/북 복도의 한가운데에 있습니다.",
    short: "긴 남/북 복도",
  },
  {
    long: "당신은 긴 남/북 복도의 북쪽 끝을 향해 3/4 지점에 있습니다.",
    short: "북쪽 3/4 지점",
  },
  {
    long: "당신은 긴 남/북 복도의 북쪽 끝에 있습니다. 위로 올라가는 계단이 있습니다.",
    short: "긴 복도 북쪽 끝",
  },
  {
    long: "당신은 긴 남/북 복도의 남쪽 끝을 향해 3/4 지점에 있습니다.",
    short: "남쪽 3/4 지점",
  },
  {
    long: "당신은 긴 남/북 복도의 남쪽 끝에 있습니다. 남쪽으로 구멍이 있습니다.",
    short: "긴 복도 남쪽 끝",
  },
  {
    long: "당신은 위아래로 이어지는 계단참에 있습니다.",
    short: "계단참",
  },
  {
    long: "당신은 위/아래로 이어지는 계단의 중간에 있습니다.",
    short: "상/하행 계단",
  },
  {
    long: "당신은 아래로 내려가는 계단의 꼭대기에 있습니다. 북동쪽으로 이어지는 크롤웨이가 있습니다.",
    short: "계단 꼭대기",
  },
  {
    long: "당신은 북동 또는 남서로 이어지는 크롤웨이에 있습니다.",
    short: "북동 크롤웨이",
  },
  {
    long: "당신은 작은 크롤 공간에 있습니다. 이곳 바닥에는 구멍이 있고, 남서쪽으로 돌아가는 작은 통로가 있습니다.",
    short: "작은 크롤공간",
  },
  {
    long: "당신은 감마 컴퓨팅 센터에 있습니다. IBM(IBM) 3090/600s가 이곳에서 윙윙거리고 있습니다. 장치 하나에서 이더넷(Ethernet) 케이블(Cable)이 나와 천장으로 이어집니다. 타이핑할 수 있는 콘솔은 없습니다.",
    short: "감마 컴퓨팅 센터",
  },
  {
    long: "당신은 우체국(Post Office)의 흔적 근처에 있습니다. 건물 외벽에 우편(Mail) 투입구가 있지만, 어디로 이어지는지는 보이지 않습니다. 동쪽으로 돌아가는 오솔길과 북쪽으로 이어지는 길이 있습니다.",
    short: "우체국",
  },
  {
    long: "당신은 메인 스트리트와 메이플 애비뉴의 교차로에 있습니다. 메인 스트리트는 남북으로, 메이플 애비뉴는 동쪽으로 멀리 뻗어 있습니다. 북쪽과 동쪽을 보면 많은 교차로가 보이지만, 예전에 서 있던 건물들은 모두 사라졌습니다. 도로 표지판만 남아 있습니다. 북서쪽으로는 한 건물을 지키는 문(Gate)으로 향하는 길이 있습니다.",
    short: "메인-메이플 교차로",
  },
  {
    long: "당신은 메인 스트리트와 오크트리 애비뉴 서쪽 끝의 교차로에 있습니다.",
    short: "메인-오크트리 교차로",
  },
  {
    long: "당신은 메인 스트리트와 버몬트 애비뉴 서쪽 끝의 교차로에 있습니다.",
    short: "메인-버몬트 교차로",
  },
  {
    long: "당신은 메인 스트리트 북쪽 끝, 사이카모어 애비뉴 서쪽 끝에 있습니다.",
    short: "메인-사이카모어 교차로",
  },
  {
    long: "당신은 퍼스트 스트리트 남쪽 끝, 메이플 애비뉴에 있습니다.",
    short: "퍼스트-메이플 교차로",
  },
  {
    long: "당신은 퍼스트 스트리트와 오크트리 애비뉴의 교차로에 있습니다.",
    short: "퍼스트-오크트리 교차로",
  },
  {
    long: "당신은 퍼스트 스트리트와 버몬트 애비뉴의 교차로에 있습니다.",
    short: "퍼스트-버몬트 교차로",
  },
  {
    long: "당신은 퍼스트 스트리트 북쪽 끝, 사이카모어 애비뉴에 있습니다.",
    short: "퍼스트-사이카모어 교차로",
  },
  {
    long: "당신은 세컨드 스트리트 남쪽 끝, 메이플 애비뉴에 있습니다.",
    short: "세컨드-메이플 교차로",
  },
  {
    long: "당신은 세컨드 스트리트와 오크트리 애비뉴의 교차로에 있습니다.",
    short: "세컨드-오크트리 교차로",
  },
  {
    long: "당신은 세컨드 스트리트와 버몬트 애비뉴의 교차로에 있습니다.",
    short: "세컨드-버몬트 교차로",
  },
  {
    long: "당신은 세컨드 스트리트 북쪽 끝, 사이카모어 애비뉴에 있습니다.",
    short: "세컨드-사이카모어 교차로",
  },
  {
    long: "당신은 서드 스트리트 남쪽 끝, 메이플 애비뉴에 있습니다.",
    short: "서드-메이플 교차로",
  },
  {
    long: "당신은 서드 스트리트와 오크트리 애비뉴의 교차로에 있습니다.",
    short: "서드-오크트리 교차로",
  },
  {
    long: "당신은 서드 스트리트와 버몬트 애비뉴의 교차로에 있습니다.",
    short: "서드-버몬트 교차로",
  },
  {
    long: "당신은 서드 스트리트 북쪽 끝, 사이카모어 애비뉴에 있습니다.",
    short: "서드-사이카모어 교차로",
  },
  {
    long: "당신은 포스 스트리트 남쪽 끝, 메이플 애비뉴에 있습니다.",
    short: "포스-메이플 교차로",
  },
  {
    long: "당신은 포스 스트리트와 오크트리 애비뉴의 교차로에 있습니다.",
    short: "포스-오크트리 교차로",
  },
  {
    long: "당신은 포스 스트리트와 버몬트 애비뉴의 교차로에 있습니다.",
    short: "포스-버몬트 교차로",
  },
  {
    long: "당신은 포스 스트리트 북쪽 끝, 사이카모어 애비뉴에 있습니다.",
    short: "포스-사이카모어 교차로",
  },
  {
    long: "당신은 피프스 스트리트 남쪽 끝, 메이플 애비뉴 동쪽 끝에 있습니다.",
    short: "피프스-메이플 교차로",
  },
  {
    long: "당신은 피프스 스트리트와 오크트리 애비뉴 동쪽 끝의 교차로에 있습니다. 동쪽으로 절벽(Cliff)이 있습니다.",
    short: "피프스-오크트리 교차로",
  },
  {
    long: "당신은 피프스 스트리트와 버몬트 애비뉴 동쪽 끝의 교차로에 있습니다.",
    short: "피프스-버몬트 교차로",
  },
  {
    long: "당신은 피프스 스트리트 북쪽 끝, 사이카모어 애비뉴 동쪽 끝에 있습니다.",
    short: "피프스-사이카모어 교차로",
  },
  {
    long: "당신은 자연사 박물관 앞에 있습니다. 북쪽의 건물로 들어가는 문이 있고, 길은 남동쪽으로 이어집니다.",
    short: "박물관 입구",
  },
  {
    long: "당신은 자연사 박물관의 중앙 로비에 있습니다. 방 한가운데에는 거대한 공룡(Dinosaur) 뼈대(Skeleton)가 있습니다. 남쪽과 동쪽으로 나가는 문이 있습니다.",
    short: "박물관 로비",
  },
  {
    long: "당신은 지질 전시관에 있습니다. 전시되던 물건은 모두 사라졌습니다. 동쪽, 서쪽, 북쪽에 방이 있습니다.",
    short: "지질 전시관",
  },
  {
    long: "당신은 해양 생물 구역에 있습니다. 방에는 물고기(Fish) 수족관(Tank)들이 가득하지만, 굶어 죽은 물고기들로 차 있습니다. 남쪽과 동쪽으로 나가는 문이 있습니다.",
    short: "해양 생물 구역",
  },
  {
    long: "당신은 박물관의 어떤 유지보수실에 있습니다. 벽에는 ‘BL’이라고 적힌 스위치(Switch)가 있습니다. 서쪽과 북쪽으로 문이 있습니다.",
    short: "유지보수실",
  },
  {
    long: "당신은 자연사에 대해 아이들을 가르치던 교실에 있습니다. 칠판(Blackboard)에는 ‘아이들은 아래층 출입 금지’라고 적혀 있습니다. 동쪽에는 ‘exit’ 표시가 있는 문이 있으며, 서쪽으로도 다른 문이 있습니다.",
    short: "교실",
  },
  {
    long: "당신은 버몬트가(Vermont)의 지하철(Subway) 역에 있습니다. 열차(Train)가 여기 대기 중입니다.",
    short: "버몬트 역",
  },
  {
    long: "당신은 박물관 지하철(Subway) 역에 있습니다. 북쪽으로 이어지는 통로가 있습니다.",
    short: "박물관 역",
  },
  {
    long: "당신은 남/북 터널에 있습니다.",
    short: "남/북 터널",
  },
  {
    long: "당신은 남/북 터널의 북쪽 끝에 있습니다. 위아래로 이어지는 계단이 있습니다. 이곳에는 쓰레기 처리기(Disposal)가 있습니다.",
    short: "남/북 터널 북쪽 끝",
  },
  {
    long: "당신은 지하철(Subway) 역 근처의 계단 위쪽에 있습니다. 서쪽으로 문이 있습니다.",
    short: "지하철(Subway) 계단 꼭대기",
  },
  {
    long: "당신은 지하철(Subway) 역 근처의 계단 아래쪽에 있습니다. 북동쪽에 방이 하나 있습니다.",
    short: "지하철(Subway) 계단 아래",
  },
  {
    long: "당신은 또 다른 컴퓨터(Computer) 실에 있습니다. 여기에는 지금까지 본 것 중 가장 큰 컴퓨터가 있습니다. 제조사 이름은 없지만 ‘이 기계의 이름은 endgame’이라는 표지판이 있습니다. 출구는 남서쪽입니다. 타이핑할 수 있는 콘솔은 없습니다.",
    short: "엔드게임 컴퓨터(Computer) 실",
  },
  {
    long: "당신은 남/북 복도에 있습니다.",
    short: "엔드게임 남/북 복도",
  },
  {
    long: "당신은 문제 방에 도착했습니다. 통과하려면 문제에 올바르게 답해야 합니다. ‘answer’ 명령으로 답하세요.",
    short: "문제 방 1",
  },
  {
    long: "당신은 남/북 복도에 있습니다.",
    short: "엔드게임 남/북 복도",
  },
  {
    long: "당신은 두 번째 문제 방에 있습니다.",
    short: "문제 방 2",
  },
  {
    long: "당신은 남/북 복도에 있습니다.",
    short: "엔드게임 남/북 복도",
  },
  {
    long: "당신은 엔드게임 보물 방에 있습니다. 북쪽으로 나가는 문이 있고 남쪽으로 이어지는 복도가 있습니다.",
    short: "엔드게임 보물 방",
  },
  {
    long: "당신은 승리자의 방에 있습니다. 남쪽으로 돌아가는 문이 있습니다.",
    short: "승리자의 방",
  },
  {
    long: "당신은 막다른 곳에 도착했습니다. 바닥에 PC(PC)가 하나 있습니다. 그 위에는 다음과 같은 표지판이 있습니다:\n          PC에서 타이핑하려면 ‘reset’ 명령을 입력하세요.\n북쪽으로 이어지는 구멍이 있습니다.",
    short: "PC 영역(PC)",
  },
];

// 밝은 방(램프 없이도 보임)
const LIGHT_ROOMS = new Set<number>([
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 24, 25, 26, 27, 28, 58, 59, 60,
  61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79,
  80, 81, 82, 83,
]);

// 지도: dungeon-map (원작 수치 그대로, -1=막힘, 255=특수)
const MAP: number[][] = [
  [96, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1], // 0
  [-1, -1, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [-1, -1, 3, 1, -1, -1, -1, -1, -1, -1, -1, -1],
  [-1, -1, -1, 2, 4, 6, -1, -1, -1, -1, -1, -1],
  [-1, -1, -1, -1, 5, -1, -1, 3, -1, -1, -1, -1],
  [-1, -1, -1, -1, 255, -1, -1, 4, -1, -1, 255, -1],
  [-1, -1, -1, -1, -1, 7, 3, -1, -1, -1, -1, -1],
  [-1, -1, -1, -1, -1, 255, 6, 27, -1, -1, -1, -1],
  [255, 5, 9, 10, -1, -1, -1, 5, -1, -1, -1, 5],
  [-1, -1, -1, 8, -1, -1, -1, -1, -1, -1, -1, -1],
  [-1, -1, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [-1, 8, -1, 58, -1, -1, -1, -1, -1, -1, -1, -1],
  [-1, -1, 13, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [15, -1, 14, 12, -1, -1, -1, -1, -1, -1, -1, -1],
  [-1, -1, -1, 13, -1, -1, -1, -1, -1, -1, -1, -1],
  [-1, 13, 16, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [-1, -1, -1, 15, -1, -1, -1, -1, -1, 17, 16, -1],
  [-1, -1, 17, 17, 17, 17, 255, 17, 255, 17, -1, -1],
  [18, 18, 18, 18, 18, -1, 18, 18, 19, 18, -1, -1],
  [-1, 18, 18, 19, 19, 20, 19, 19, -1, 18, -1, -1],
  [-1, -1, -1, 18, -1, -1, -1, -1, -1, 21, -1, -1],
  [-1, -1, -1, -1, -1, 20, 22, -1, -1, -1, -1, -1],
  [18, 18, 18, 18, 16, 18, 23, 18, 18, 18, 18, 18],
  [-1, 255, -1, -1, -1, 19, -1, -1, -1, -1, -1, -1],
  [23, 25, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [24, 255, -1, -1, -1, -1, -1, -1, -1, -1, 255, -1],
  [255, 28, -1, -1, -1, -1, -1, -1, -1, -1, 255, -1],
  [-1, -1, -1, -1, 7, -1, -1, -1, -1, -1, -1, -1],
  [26, 255, -1, -1, -1, -1, -1, -1, -1, -1, 255, -1],
  [-1, -1, 30, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [-1, -1, 31, 29, -1, -1, -1, -1, -1, -1, -1, -1],
  [32, 33, -1, 30, -1, -1, -1, -1, -1, -1, -1, -1],
  [-1, 31, -1, 255, -1, -1, -1, -1, -1, 34, -1, -1],
  [31, -1, -1, -1, -1, -1, -1, -1, -1, 35, -1, -1],
  [-1, 35, -1, -1, -1, -1, -1, -1, 32, 37, -1, -1],
  [34, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [-1, -1, -1, -1, -1, -1, -1, 38, 34, -1, -1, -1],
  [-1, -1, 40, 41, 37, -1, -1, 39, -1, -1, -1, -1],
  [-1, -1, -1, -1, 38, -1, -1, -1, -1, -1, -1, -1],
  [-1, -1, -1, 38, -1, -1, -1, -1, 42, -1, -1, -1],
  [-1, -1, 38, -1, -1, -1, -1, -1, -1, 43, -1, -1],
  [-1, -1, -1, -1, -1, -1, -1, -1, -1, 40, -1, -1],
  [44, -1, 46, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [-1, 43, 45, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [-1, 46, -1, 44, -1, -1, -1, -1, -1, -1, -1, -1],
  [45, -1, -1, 43, -1, -1, -1, -1, -1, 255, -1, -1],
  [48, 50, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [49, 47, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [-1, 48, -1, -1, -1, -1, -1, -1, 52, -1, -1, -1],
  [47, 51, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [50, 104, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [-1, -1, -1, -1, -1, -1, -1, -1, 53, 49, -1, -1],
  [-1, -1, -1, -1, -1, -1, -1, -1, 54, 52, -1, -1],
  [-1, -1, -1, -1, 55, -1, -1, -1, -1, 53, -1, -1],
  [-1, -1, -1, -1, 56, -1, -1, 54, -1, -1, -1, 54],
  [-1, -1, -1, -1, -1, -1, -1, 55, -1, 31, -1, -1],
  [-1, -1, 32, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [59, -1, 11, -1, -1, -1, -1, -1, -1, -1, 255, 255],
  [60, 58, 63, -1, -1, -1, 255, -1, -1, -1, 255, 255],
  [61, 59, 64, -1, -1, -1, -1, -1, -1, -1, 255, 255],
  [62, 60, 65, -1, -1, -1, -1, -1, -1, -1, 255, 255],
  [-1, 61, 66, -1, -1, -1, -1, -1, -1, -1, 255, 255],
  [64, -1, 67, 59, -1, -1, -1, -1, -1, -1, 255, 255],
  [65, 63, 68, 60, -1, -1, -1, -1, -1, -1, 255, 255],
  [66, 64, 69, 61, -1, -1, -1, -1, -1, -1, 255, 255],
  [-1, 65, 70, 62, -1, -1, -1, -1, -1, -1, 255, 255],
  [68, -1, 71, 63, -1, -1, -1, -1, -1, -1, 255, 255],
  [69, 67, 72, 64, -1, -1, -1, -1, -1, -1, 255, 255],
  [70, 68, 73, 65, -1, -1, -1, -1, -1, -1, 255, 255],
  [-1, 69, 74, 66, -1, -1, -1, -1, -1, -1, 255, 255],
  [72, -1, 75, 67, -1, -1, -1, -1, -1, -1, 255, 255],
  [73, 71, 76, 68, -1, -1, -1, -1, -1, -1, 255, 255],
  [74, 72, 77, 69, -1, -1, -1, -1, -1, -1, 255, 255],
  [-1, 73, 78, 70, -1, -1, -1, -1, -1, -1, 255, 255],
  [76, -1, 79, 71, -1, -1, -1, -1, -1, -1, 255, 255],
  [77, 75, 80, 72, -1, -1, -1, -1, -1, -1, 255, 255],
  [78, 76, 81, 73, -1, -1, -1, -1, -1, -1, 255, 255],
  [-1, 77, 82, 74, -1, -1, -1, -1, -1, -1, 255, 255],
  [80, -1, -1, 75, -1, -1, -1, -1, -1, -1, 255, 255],
  [81, 79, 255, 76, -1, -1, -1, -1, -1, -1, 255, 255],
  [82, 80, -1, 77, -1, -1, -1, -1, -1, -1, 255, 255],
  [-1, 81, -1, 78, -1, -1, -1, -1, -1, -1, 255, 255],
  [84, -1, -1, -1, -1, 59, -1, -1, -1, -1, 255, 255],
  [-1, 83, 85, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [86, -1, 87, 84, -1, -1, -1, -1, -1, -1, -1, -1],
  [-1, 85, 88, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [88, -1, -1, 85, -1, -1, -1, -1, -1, -1, -1, -1],
  [-1, 87, 255, 86, -1, -1, -1, -1, -1, -1, -1, -1],
  [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 255, -1],
  [91, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [92, 90, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [-1, 91, -1, -1, -1, -1, -1, -1, 93, 94, -1, -1],
  [-1, -1, -1, 88, -1, -1, -1, -1, -1, 92, -1, -1],
  [-1, -1, -1, -1, 95, -1, -1, -1, 92, -1, -1, -1],
  [-1, -1, -1, -1, -1, -1, -1, 94, -1, -1, -1, -1],
  [97, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [99, 97, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [101, 99, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [103, 101, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [-1, 102, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [51, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
];

// 방 안의 고정 장식/설치물(원작과 동일)
const ROOM_SILENTS: Array<ObjId[] | null> = (() => {
  const A: Array<ObjId[] | null> = Array(105).fill(null);
  A[1] = [OBJ.tree, OBJ.coconut];
  A[2] = [OBJ.tree, OBJ.coconut];
  A[9] = [OBJ.bin];
  A[10] = [OBJ.cabinet]; // computer
  A[16] = [OBJ.ladder];
  A[17] = [OBJ.button, OBJ.ladder];
  A[25] = [OBJ.lake];
  A[26] = [OBJ.lake];
  A[28] = [OBJ.chute];
  A[34] = [OBJ.painting, OBJ.bed];
  A[35] = [OBJ.urinal, OBJ.pipes];
  A[42] = [OBJ.boulder];
  A[57] = [OBJ.cabinet, OBJ.cable]; // gamma + cable
  A[58] = [OBJ.mail];
  A[59] = [OBJ.gate];
  A[80] = [OBJ.cliff];
  A[84] = [OBJ.skeleton];
  A[86] = [OBJ.fish, OBJ.tanks];
  A[87] = [OBJ.swtch];
  A[88] = [OBJ.blackboard];
  A[89] = [OBJ.subway];
  A[95] = [OBJ.cabinet];
  A[104] = [OBJ.pc];
  return A;
})();

// 방 안의 이름있는 물건(휴대/상호작용 대상). 원작 배열을 그대로 이식
const ROOM_OBJECTS: Array<ObjId[] | null> = (() => {
  const A: Array<ObjId[] | null> = Array(105).fill(null);

  A[1] = [OBJ.shovel];
  A[6] = [OBJ.food];
  A[7] = [OBJ.bear];
  A[10] = [OBJ.special];
  A[11] = [OBJ.lamp, OBJ.license, OBJ.silver];
  A[14] = [OBJ.special];
  A[16] = [OBJ.weight, OBJ.life];
  A[19] = [OBJ.rms, OBJ.floppy];
  A[28] = null;
  A[29] = [OBJ.gold];
  A[41] = null;
  A[46] = [OBJ.towel, OBJ.special];
  A[52] = [OBJ.box];
  A[56] = [OBJ.axe];
  A[59] = null;
  A[77] = null;
  A[80] = [OBJ.coins];
  A[82] = [OBJ.bus];
  A[84] = [OBJ.bone];
  A[86] = [OBJ.jar, OBJ.special, OBJ.ruby];
  A[87] = [OBJ.nitric];
  A[88] = [OBJ.glycerine];
  A[94] = [OBJ.amethyst];
  A[97] = [OBJ.special];
  A[99] = [OBJ.special];
  A[101] = [OBJ.special];
  A[103] = [OBJ.mona];
  // 나머지는 null
  return A;
})();

// 파기 가능한 지점(원작과 동일)
const DIGGABLES: Array<ObjId[] | null> = (() => {
  const A: Array<ObjId[] | null> = Array(105).fill(null);
  A[3] = [OBJ.cpu];
  A[41] = [OBJ.platinum];
  return A;
})();

// 휴대 가능 오브젝트 설명(방/인벤토리 표기)
const OBJ_DESC: Array<[string, string]> = [
  ["여기에 삽(shovel)이 있다.", "삽(shovel)"],
  ["근처에 램프(lamp)가 있다.", "램프(lamp)"],
  ["CPU 보드(cpu)가 있다.", "컴퓨터 보드(cpu board)"],
  ["여기에 음식(food)이 있다.", "음식(food)"],
  ["반짝이는 황동 열쇠(key)가 있다.", "황동 열쇠(key)"],
  ["종이 쪼가리(paper)가 있다.", "종이(paper)"],
  ["리처드 스톨만 석고상(RMS)이 있다.", "RMS 석고상(statuette)"],
  ["반짝이는 다이아몬드(diamond)가 있다.", "다이아몬드(diamond)"],
  ["10파운드 무게추(weight)가 있다.", "무게추(weight)"],
  ["구명조끼(life preserver)가 있다.", "구명조끼(life preserver)"],
  ["에메랄드 팔찌(bracelet)가 있다.", "팔찌(emerald bracelet)"],
  ["금괴(gold bar)가 있다.", "금괴(gold)"],
  ["백금괴(platinum bar)가 있다.", "백금괴(platinum)"],
  ["바닥에 비치 타월(towel)이 있다.", "수건(towel)"],
  ["도끼(axe)가 있다.", "도끼(axe)"],
  ["은괴(silver bar)가 있다.", "은괴(silver)"],
  ["버스 운전면허(license)가 있다.", "운전면허(license)"],
  ["귀중한 동전(coins) 몇 개가 있다.", "귀중한 동전(coins)"],
  ["보석 달걀(egg)이 있다.", "보석 달걀(egg)"],
  ["유리병(jar)이 있다.", "유리병(jar)"],
  ["공룡 뼈(bone)가 있다.", "뼈(bone)"],
  ["질산(nitric acid) 봉지가 있다.", "질산(nitric)"],
  ["글리세린(glycerine) 봉지가 있다.", "글리세린(glycerine)"],
  ["귀중한 루비(ruby)가 있다.", "루비(ruby)"],
  ["귀중한 자수정(amethyst)이 있다.", "자수정(amethyst)"],
  ["모나리자(Mona Lisa)가 있다.", "모나리자(Mona Lisa)"],
  ["100달러 지폐($100 bill)가 있다.", "$100 지폐"],
  ["플로피 디스크(floppy)가 있다.", "플로피 디스크(floppy)"],
];

// 무게/점수(원작 값)
const OBJ_LBS = [
  2, 1, 1, 1, 1, 0, 2, 2, 10, 3, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 0, 2, 2, 1,
  0, 0,
];
const OBJ_PTS = [
  0, 0, 0, 0, 0, 0, 0, 10, 0, 0, 10, 10, 10, 0, 0, 10, 0, 10, 10, 0, 0, 0, 0,
  10, 10, 10, 10, 0,
];

// 유닉스 파일명(원작)
const OBJ_FILES = [
  "shovel.o",
  "lamp.o",
  "cpu.o",
  "food.o",
  "key.o",
  "paper.o",
  "rms.o",
  "diamond.o",
  "weight.o",
  "preserver.o",
  "bracelet.o",
  "gold.o",
  "platinum.o",
  "towel.o",
  "axe.o",
  "silver.o",
  "license.o",
  "coins.o",
  "egg.o",
  "jar.o",
  "bone.o",
  "nitric.o",
  "glycerine.o",
  "ruby.o",
  "amethyst.o",
];

// 고정물 설명(방 묘사 중 출력되는 텍스트)
const PERM_OBJECT_LINES: Array<string | null> = [
  null,
  "큰 바위(boulder)가 있다.",
  null,
  "사나운 곰(bear)이 있다!",
  null,
  null,
  "가치 없는 걸쭉한 원형질(protoplasm)이 있다.",
  null,
  null,
  null,
  null,
  null,
  null,
  "이 방에는 이상한 냄새가 난다.",
  null,
  "벽에 볼트로 고정된 열쇠 박스(box)가 있다. 윗면에 틈이 있다.",
  null,
  null,
  "버스(bus)가 있다.",
  null,
  null,
  null,
];

// 조사(examine) 시 출력(휴대 가능)
const PHYSOBJ_EXAM: Array<string | null> = [
  "일반적인 삽이다. 가격표에 $19.99라고 적혀 있다.",
  "이 램프는 제페토가 수작업으로 만들었다.",
  "VAX 칩이 달린 CPU 보드다. 온보드 RAM은 2MB로 보인다.",
  "무언가 고기 같다. 냄새가 별로다.",
  null,
  "종이에 적혀 있다: help를 잊지 마라. 그리고 이 단어: ‘worms’",
  "유명한 EMACS의 저자 Richard Stallman의 상. 맨발이다.",
  null,
  "무겁다.",
  "SS Minnow라고 적혀 있다.",
  null,
  null,
  null,
  "스누피가 그려져 있다.",
  null,
  null,
  "사진이 너를 닮았다!",
  "19세기 동전 같다.",
  "귀중한 파베르게 달걀이다.",
  "평범한 유리병이다.",
  null,
  null,
  null,
  null,
  null,
];

// 고정물 조사(examine) 시 출력
const PERMOBJ_EXAM: Array<string | null> = [
  null,
  "그저 바위일 뿐, 옮길 수 없다.",
  "야자수들이다. 코코넛이 많이 열려 있다.",
  "회색곰(그리즐리)로 보인다.",
  "모든 우편함은 비어 있다. 바닥에 이름이 흐릿하게 보이는데, 간신히 읽히는 건:\n  Jeffrey Collier\n  Robert Toukmond\n  Thomas Stock",
  null,
  "뒤섞인 엉망이다.",
  "다이얼 눈금은 색이 바래 읽을 수 없다.",
  null,
  null,
  "엘비스 프레슬리의 벨벳 그림이다. 벽에 못 박혀 있어 움직일 수 없다.",
  "퀸사이즈 침대. 아주 단단한 매트리스.",
  "소변기는 아주 깨끗하다. 배수구는 빠져 있고, 아래 파이프로 큰 구멍이 이어진다. 사람은 들어가기엔 너무 작다. 플러시 손잡이는 반짝여 비칠 정도다.",
  null,
  null,
  "상자 윗면 틈 위에 서툰 글씨로 쓰여 있다: ‘열쇠 업그레이드: 열쇠를 여기 넣으시오.’",
  null,
  "‘익스프레스 메일’이라고 적혀 있다.",
  "35인승 버스. ‘mobytours’라는 회사명.",
  "너무 커서 넘어갈 수 없는 금속 게이트.",
  "아주 높은 절벽이다.",
  "공룡에 대해 잘 모르지만 아주 커 보인다.",
  "물고기들이 한때는 아름다웠을 듯하다.",
  null,
  null,
  null,
  null,
  "영구적으로 고정된 사다리다.",
  "승객 열차가 출발 대기 중이다.",
  "플로피 드라이브 하나뿐인 개인용 컴퓨터다.",
];

// 엔드게임 질문(한국어 질문, 정답 문자열은 원작과 동일/영어)
type QA = { q: string; a: string[] };
let ENDGAME_Q: QA[] = [
  { q: "‘pokey’(VAX)에서 너의 로그인 비밀번호는?", a: ["robert"] },
  { q: "gamma에 익명 ftp로 접속할 때 사용한 비밀번호는?", a: ["foo"] },
  {
    q: "엔드게임 제외, 보물을 점수로 인정받을 수 있게 넣을 수 있는 장소는 몇 곳인가?",
    a: ["4", "four"],
  },
  { q: "‘endgame’ 머신에서 너의 로그인 이름은?", a: ["toukmond"] },
  { q: "삽(shovel)의 가격(달러)을 반올림한 값은?", a: ["20", "twenty"] },
  { q: "마을 버스 회사 이름은?", a: ["mobytours"] },
  {
    q: "우편실 바닥 이름 목록에서(너 빼고) 두 성 중 하나는?",
    a: ["collier", "stock"],
  },
  { q: "수건(towel)에 있는 만화 캐릭터는?", a: ["snoopy"] },
  { q: "EMACS 저자의 성(last name)은?", a: ["stallman"] },
  { q: "VAX용 CPU 보드의 메모리(MB)는?", a: ["2"] },
  { q: "거리 이름 중 미국의 주 이름과 같은 것은?", a: ["vermont"] },
  { q: "무게추(weight)는 몇 파운드였나?", a: ["ten", "10"] },
  {
    q: "지하철역 바로 위를 지나는 ‘거리(street)’ 이름은?",
    a: ["fourth", "4", "4th"],
  },
  {
    q: "마을(우체국 코너 제외) 코너 수는?",
    a: ["24", "twentyfour", "twenty-four"],
  },
  { q: "열쇠를 숨긴 곰의 종류는?", a: ["grizzly"] },
  {
    q: "파서(dig)로 찾은 물건 중 하나를 대라.",
    a: ["cpu", "card", "vax", "board", "platinum"],
  },
  {
    q: "pokey와 gamma 사이의 네트워크 프로토콜은?",
    a: ["tcp/ip", "ip", "tcp"],
  },
];

// 게임 상태
class Game {
  mode: Mode = "dungeon";
  currentRoom: RoomId = RM.dead_end; // 원작 시작: 1
  lastRoomShown = -1;
  dead = false;

  // 상태 변수 (원작 변수명 최대한 유지)
  visited = new Set<number>([27]); // 시작 전 세팅과 동일
  inventory: ObjId[] = [OBJ.lamp]; // 시작 아이템: 램프
  inBus = false;
  nomail = false;
  jar: ObjId[] = []; // 병 안에 든 것
  black = false; // BL 스위치(블랙라이트)
  inEndgame = false;
  endQCurrent: QA | null = null;
  correctAnswer: string[] | null = null;
  endQuestionsPool: QA[] = ENDGAME_Q.slice();
  lastDir: Dir = DIR.N;
  saunaLevel = 0;
  computerOn = false;
  floppyInserted = false;
  keyLevel = 0;
  holeOpen = false;
  ethernet = true;
  floppyMelted = false;
  numCmds = 0;

  // 유닉스 셸 상태
  unixLoggedIn = false;
  unixCdRoom: number = -10; // /usr/toukmond
  unixCdPath: string = "/usr/toukmond";
  unixUncompressed = false;
  unixFTType: "ascii" | "binary" = "ascii";

  // DOS 상태
  // ...

  // 난수 요소
  eggLoc = randInt(60, 77); // 60~77
  combination = String(randInt(100, 999)); // 3자리

  // 특수 플래그들
  endgameTreasureRoomObjs: ObjId[] = []; // 엔드게임 점수
  gotToiletNeed = true; // sleep 후 소변 필요

  constructor() {
    // 방 배치: 달걀 위치 추가
    const arr = ROOM_OBJECTS[this.eggLoc] || [];
    ROOM_OBJECTS[this.eggLoc] = [...arr, OBJ.egg];
  }

  start() {
    this.showPrompt(true);
  }

  showPrompt(force = false) {
    if (this.dead) return;
    if (this.mode === "dungeon") {
      if (force || this.lastRoomShown !== this.currentRoom) {
        this.describeRoom();
        this.lastRoomShown = this.currentRoom;
      }
      printDOM("> ");
    } else if (this.mode === "unix") {
      printDOM("$ ");
    } else if (this.mode === "dos") {
      printDOM("A> ");
    }
  }

  // 출력 도우미
  say(s: string) {
    println(s);
  }
  sayln() {
    println();
  }

  // 명령 처리
  handle(line: string) {
    const raw = line;
    const tokens = tokenize(line);
    if (tokens.length === 0) {
      this.showPrompt();
      return;
    }

    if (this.mode === "dungeon") this.parseDungeon(tokens, raw);
    else if (this.mode === "unix") this.parseUnix(tokens, raw);
    else this.parseDos(tokens, raw);
  }

  // 던전 모드 파서
  parseDungeon(tokens: string[], raw: string) {
    const verb = this.firstWord(tokens);
    if (!verb) {
      this.say("무슨 뜻인지 알 수 없습니다.");
      this.showPrompt();
      return;
    }

    const rest = this.skipIgnored(tokens.slice(1));

    const call = (fn: Function) => {
      this.numCmds++;
      return fn.call(this, rest);
    };
    switch (verb) {
      // 이동
      case "n":
      case "north":
        return call(() => this.move(DIR.N));
      case "s":
      case "south":
        return call(() => this.move(DIR.S));
      case "e":
      case "east":
        return call(() => this.move(DIR.E));
      case "w":
      case "west":
        return call(() => this.move(DIR.W));
      case "ne":
      case "northeast":
        return call(() => this.move(DIR.NE));
      case "se":
      case "southeast":
        return call(() => this.move(DIR.SE));
      case "nw":
      case "northwest":
        return call(() => this.move(DIR.NW));
      case "sw":
      case "southwest":
        return call(() => this.move(DIR.SW));
      case "up":
      case "u":
        return call(() => this.move(DIR.UP));
      case "down":
      case "d":
        return call(() => this.move(DIR.DOWN));
      case "in":
        return call(() => this.move(DIR.IN));
      case "out":
      case "exit":
      case "leave":
        return call(() => this.move(DIR.OUT));
      case "go": {
        if (rest.length === 0) {
          this.say("어디로 가라는 건지 모르겠습니다.");
          break;
        }
        return this.parseDungeon([rest[0], ...rest.slice(1)], raw);
      }

      // 정보
      case "look":
      case "l":
      case "describe":
      case "examine":
      case "x":
        return call(() => this.examine(rest));

      case "inventory":
      case "i":
        return call(() => this.inven());

      case "score":
        return call(() => this.score());

      case "help":
        return call(() => this.help());

      case "quit":
        return call(() => this.quit());

      // 상호작용
      case "take":
      case "get":
        return call(() => this.take(rest));
      case "drop":
      case "throw":
        return call(() => this.drop(rest));
      case "put":
      case "insert":
        return call(() => this.put(rest));
      case "dig":
        return call(() => this.dig());
      case "climb":
        return call(() => this.climb(rest));
      case "shake":
      case "wave":
        return call(() => this.shake(rest));
      case "eat":
        return call(() => this.eat(rest));
      case "press":
      case "push":
      case "switch":
        return call(() => this.press(rest));
      case "turn":
        return call(() => this.turn(rest));
      case "swim":
        return call(() => this.swim());
      case "sleep":
      case "lie":
        return call(() => this.sleep());
      case "urinate":
      case "piss":
        return call(() => this.piss());
      case "flush":
        return call(() => this.flush());
      case "break":
      case "chop":
      case "cut":
        return call(() => this.breakObj(rest));
      case "drive":
        return call(() => this.drive());
      case "board":
      case "enter":
        return call(() => this.move(DIR.IN));
      case "on":
        return call(() => this.move(DIR.IN));
      case "off":
        return call(() => this.move(DIR.OUT));
      case "feed":
        return call(() => this.feed(rest));
      case "answer":
        return call(() => this.answer(rest));

      // 시스템/인터페이스
      case "type":
        return call(() => this.typeOn());
      case "reset":
        return call(() => this.power());

      // 모드/기타
      case "long":
      case "verbose":
        // 원작: long 모드(첫 방문 아니어도 긴 설명). 여기서는 즉시 긴 설명 재출력.
        this.lastRoomShown = -1;
        return this.showPrompt(true);

      case "save":
        return call(() => this.save(rest));
      case "restore":
        return call(() => this.restore(rest));

      // 디버그/테스트 유사
      case "die":
        return call(() => this.die());

      default:
        this.say("무슨 뜻인지 모르겠습니다.");
    }
    this.showPrompt();
  }

  // 유닉스 모드
  parseUnix(tokens: string[], raw: string) {
    const verb = tokens[0];
    const args = tokens.slice(1);

    switch (verb) {
      case "exit":
        this.mode = "dungeon";
        this.say("\n콘솔에서 물러선다.");
        this.showPrompt(true);
        return;
      case "ls":
        return this.unix_ls(args);
      case "pwd":
        return this.unix_pwd();
      case "cd":
        return this.unix_cd(args);
      case "echo":
        return this.unix_echo(args);
      case "ftp":
      case "ssh":
      case "rlogin":
        return this.unix_net(verb, args);
      case "uncompress":
        return this.unix_uncompress(args);
      case "cat":
        return this.unix_cat(args);
      default:
        this.say(`${verb}: 찾을 수 없음.`);
    }
    this.showPrompt();
  }

  // DOS 모드
  parseDos(tokens: string[], raw: string) {
    const verb = (tokens[0] || "").toLowerCase();
    const args = tokens.slice(1);
    switch (verb) {
      case "exit":
        this.mode = "dungeon";
        this.say("\n전원을 끄고 한 걸음 물러선다.");
        this.showPrompt(true);
        return;
      case "dir":
        return this.dos_dir(args);
      case "type":
        return this.dos_type(args);
      case "command":
        this.say("서브셸을 생성할 수 없다.");
        break;
      case "a:":
      case "b:":
      case "c:":
        this.say("잘못된 드라이브 지정.");
        break;
      default:
        if (verb === "") {
          break;
        }
        this.say("Bad command or file name");
    }
    this.showPrompt();
  }

  // -----------------------------
  // 공통 파서 보조
  firstWord(tokens: string[]) {
    let i = 0;
    while (i < tokens.length && IGNORE.has(tokens[i])) i++;
    return tokens[i];
  }
  skipIgnored(tokens: string[]) {
    let i = 0;
    while (i < tokens.length && IGNORE.has(tokens[i])) i++;
    return tokens.slice(i);
  }
  parseObjArg(tokens: string[]): ObjId | null {
    const w = this.firstWord(tokens);
    if (!w) return null;
    return w in OBJNAME ? OBJNAME[w] : null;
  }

  // -----------------------------
  // 방 묘사/특수 오브젝트
  isDark() {
    return (
      !LIGHT_ROOMS.has(this.currentRoom) &&
      !this.has(OBJ.lamp) &&
      !(ROOM_OBJECTS[this.currentRoom] || []).includes(OBJ.lamp)
    );
  }

  describeRoom() {
    if (this.isDark()) {
      this.say("칠흑같이 어둡다. 그루(grue)에게 잡아먹힐지도 모른다.");
      return;
    }
    const R = ROOMS[this.currentRoom];
    this.say(R.long);
    // 특수 오브젝트 설명/상태 변화
    this.specialObjectDescribe();

    // 방의 휴대 가능 오브젝트
    const objs = ROOM_OBJECTS[this.currentRoom] || [];
    for (const o of objs) {
      if (o === OBJ.special) continue;
      if (o >= 0) {
        this.say(OBJ_DESC[o][0]);
      } else {
        // 고정물
        const idx = Math.abs(o);
        const line = PERM_OBJECT_LINES[idx];
        if (line) this.say(line);
      }
    }
    // 병 내용 출력
    if (objs.includes(OBJ.jar) && this.jar.length > 0) {
      this.say("유리병(jar) 안에는:");
      for (const j of this.jar) {
        this.say("  - " + OBJ_DESC[j][0].replace("여기에 ", ""));
      }
    }
    if (objs.includes(OBJ.bus) && this.inBus) {
      this.say("너는 지금 버스 위에 있다.");
    }
    this.visited.add(Math.abs(this.currentRoom));
  }

  specialObjectDescribe() {
    // 컴퓨터실: 불빛
    if (this.currentRoom === RM.computer_room) {
      if (this.computerOn) this.say("패널의 불빛이 질서정연하게 깜빡인다.");
      else this.say("패널의 불빛은 고요하다.");
    }
    // 빨간 방: 수건을 들추면 바닥 구멍
    if (
      this.currentRoom === RM.red46 &&
      !(ROOM_OBJECTS[RM.red46] || []).includes(OBJ.towel)
    ) {
      this.say("바닥에 구멍이 있다.");
    }
    // 해양 생물 구역: 블랙라이트
    if (this.currentRoom === RM.marine && this.black) {
      this.say(
        "검은 빛(블랙라이트)이 물고기와 일부 물건을 오싹하게 빛나게 한다.",
      );
    }
    // 4th & Vermont 구멍
    if (this.currentRoom === RM.fourth_vermont && this.holeOpen) {
      if (!this.inBus) {
        this.say("땅 구멍으로 떨어졌다!");
        this.currentRoom = RM.vermont_station;
        this.describeRoom();
      } else {
        this.say("버스가 구멍으로 떨어져 폭발했다.");
        this.die("화염");
      }
    }
    // 엔드게임 질문
    if (this.currentRoom > RM.endgame_computer) {
      if (!this.correctAnswer) this.endgameQuestion();
      else {
        this.say("너의 질문은:");
        this.say(this.endQCurrent?.q || "");
      }
    }
    // 사우나 온도
    if (this.currentRoom === RM.sauna) {
      const L = this.saunaLevel;
      this.say(
        [
          "여긴 상온이다.",
          "미지근하다.",
          "편안하게 뜨겁다.",
          "상쾌할 정도로 뜨겁다.",
          "죽었다.",
        ][Math.min(L, 4)],
      );
      if (L === 3) {
        // RMS 녹아 다이아, 플로피 연소
        this.saunaMelt();
      }
    }
  }

  saunaMelt() {
    // RMS -> diamond
    const here = ROOM_OBJECTS[this.currentRoom] || [];
    const hasRmsHere = here.includes(OBJ.rms);
    const hasRmsInv = this.has(OBJ.rms);
    if (hasRmsHere || hasRmsInv) {
      this.say("RMS 상의 왁스가 녹아내리더니 아름다운 다이아몬드만 남았다!");
      if (hasRmsInv) {
        this.removeInv(OBJ.rms);
        this.inventory.push(OBJ.diamond);
      } else {
        this.removeFromRoom(this.currentRoom, OBJ.rms);
        this.addToRoom(this.currentRoom, OBJ.diamond);
      }
    }
    const hasFloppyHere = here.includes(OBJ.floppy);
    const hasFloppyInv = this.has(OBJ.floppy);
    if (hasFloppyHere || hasFloppyInv) {
      this.say("플로피 디스크가 녹아 불타더니 사라졌다.");
      if (hasFloppyInv) this.removeInv(OBJ.floppy);
      else this.removeFromRoom(this.currentRoom, OBJ.floppy);
      this.floppyMelted = true;
    }
  }

  // -----------------------------
  // 이동/특수 이동
  move(dir: Dir) {
    if (this.isDark()) {
      this.say("그루(grue)에 걸려 구덩이로 떨어져 전신이 부러졌다.");
      this.die("그루");
      return;
    }
    const dest = MAP[this.currentRoom][dir];
    if (dest === -1) {
      this.say("그 방향으로는 갈 수 없다.");
      return;
    }
    this.lastDir = dir;

    if (dest === 255) {
      this.specialMove(dir);
      return;
    }

    // 버스 승차중 이동 제한
    if (this.inBus) {
      if (dest < 58 || dest > 83) {
        this.say("버스는 그 쪽으로 갈 수 없다.");
        return;
      }
      this.say("버스가 덜컹거리며 급정거한다.");
      this.removeFromRoom(this.currentRoom, OBJ.bus);
      this.currentRoom = dest;
      this.addToRoom(dest, OBJ.bus);
      this.lastRoomShown = -1;
      this.showPrompt(true);
      return;
    }
    this.currentRoom = dest;
    this.lastRoomShown = -1;
    this.showPrompt(true);
  }

  specialMove(dir: Dir) {
    // 건물 앞 문: 열쇠 필요
    if (this.currentRoom === RM.building_front) {
      if (!this.has(OBJ.key)) this.say("이 문을 열 수 있는 열쇠가 없다.");
      else this.currentRoom = RM.old_hall;
      this.lastRoomShown = -1;
      this.showPrompt(true);
      return;
    }
    // 북쪽 동굴 입구: 조합 자물쇠
    if (this.currentRoom === RM.north_cave) {
      this.say("들어가려면 3자리 조합을 입력해야 한다.");
      this.say(`여기에 입력: (대답은 'answer ${this.combination}' 아님)`);
      // 브라우저에서는 즉석 입력이 어려우므로 안내:
      this.say(
        `힌트: 조합은 PC에서 'type foo.txt'로 확인 가능. (PC까지 가야 함)`,
      );
      return;
    }
    // 곰 서식지 통과
    if (this.currentRoom === RM.bear_hangout) {
      const here = ROOM_OBJECTS[this.currentRoom] || [];
      if (here.includes(OBJ.bear)) {
        this.say("곰은 네가 지나가려는 무례함에 화가 났다. 네 머리를 뜯는다.");
        this.die("곰");
        return;
      } else {
        this.say("그 길로는 못 간다.");
        return;
      }
    }
    // 버몬트 역: 기차 탑승
    if (this.currentRoom === RM.vermont_station) {
      this.say(
        "열차에 오르자마자 출발했다. 덜컹거리는 탑승 후, 갑자기 멈춰 너를 밖으로 던지고 떠나버린다.",
      );
      this.currentRoom = RM.museum_station;
      this.lastRoomShown = -1;
      this.showPrompt(true);
      return;
    }
    // 오래된 복도->초원: 열쇠 업그레이드 수준
    if (this.currentRoom === RM.old_hall) {
      if (this.has(OBJ.key) && this.keyLevel > 0) this.currentRoom = RM.meadow;
      else this.say("이 문을 열 수 있는 열쇠가 없다.");
      this.lastRoomShown = -1;
      this.showPrompt(true);
      return;
    }
    // 미로 버튼 방
    if (this.currentRoom === RM.maze_button && dir === DIR.NW) {
      const hasWeight = (ROOM_OBJECTS[RM.maze_button] || []).includes(
        OBJ.weight,
      );
      if (hasWeight) this.currentRoom = 18;
      else this.say("그쪽으로 갈 수 없다.");
      this.lastRoomShown = -1;
      this.showPrompt(true);
      return;
    }
    if (this.currentRoom === RM.maze_button && dir === DIR.UP) {
      const hasWeight = (ROOM_OBJECTS[RM.maze_button] || []).includes(
        OBJ.weight,
      );
      if (hasWeight) this.say("그쪽으로 갈 수 없다.");
      else this.currentRoom = RM.weight_room;
      this.lastRoomShown = -1;
      this.showPrompt(true);
      return;
    }
    // 교실 문 잠김
    if (this.currentRoom === RM.classroom) {
      this.say("문이 잠겨 있다.");
      return;
    }
    // 호숫가 수영 유도
    if (this.currentRoom === RM.lake_n || this.currentRoom === RM.lake_s) {
      this.swim();
      return;
    }
    // 접수처 -> 밖: 온도 과열 시 폭발
    if (this.currentRoom === RM.reception) {
      if (this.saunaLevel !== 3) this.currentRoom = RM.health_front;
      else {
        this.say(
          "나오자마자 건물에서 불꽃이 새더니 폭발! 화염에 휩싸여 죽었다.",
        );
        this.die("화염");
        return;
      }
      this.lastRoomShown = -1;
      this.showPrompt(true);
      return;
    }
    // 빨간 방 구멍
    if (this.currentRoom === RM.red46) {
      const hasTowel = (ROOM_OBJECTS[RM.red46] || []).includes(OBJ.towel);
      if (!hasTowel) this.currentRoom = RM.long_ns;
      else this.say("그쪽으로 갈 수 없다.");
      this.lastRoomShown = -1;
      this.showPrompt(true);
      return;
    }
    // 버스 탑승/하차/도로 특수
    if (this.currentRoom >= RM.gamma && this.currentRoom < RM.museum_lobby) {
      const here = ROOM_OBJECTS[this.currentRoom] || [];
      if (!here.includes(OBJ.bus)) {
        this.say("그쪽으로 갈 수 없다.");
        return;
      }
      if (dir === DIR.IN) {
        if (this.inBus) this.say("이미 버스 안이다!");
        else if (this.has(OBJ.license)) {
          this.say("버스에 올라 운전석에 앉았다.");
          this.nomail = true;
          this.inBus = true;
        } else this.say("이 차량 면허가 없다.");
      } else {
        if (!this.inBus) this.say("이미 버스 밖이다!");
        else {
          this.say("버스에서 내렸다.");
          this.inBus = false;
        }
      }
      return;
    }
    if (this.currentRoom === RM.fifth_oak) {
      if (!this.inBus) {
        this.say("절벽 아래로 굴러 머리를 부딪쳤다.");
        this.die("절벽");
        return;
      }
      this.say("버스가 절벽 아래로 추락하여 폭발했다.");
      this.die("버스 사고");
      return;
    }
    if (this.currentRoom === RM.main_maple) {
      if (!this.inBus) this.say("게이트가 열리지 않는다.");
      else {
        this.say("버스가 다가가자 게이트가 열리고 통과한다.");
        this.removeFromRoom(RM.main_maple, OBJ.bus);
        this.addToRoom(RM.museum_entr, OBJ.bus);
        this.currentRoom = RM.museum_entr;
      }
      this.lastRoomShown = -1;
      this.showPrompt(true);
      return;
    }
    if (this.currentRoom === RM.cave_entr) {
      this.say("들어서자마자 천장에서 굴러내린 바위들이 입구를 막았다.");
      this.currentRoom = RM.misty;
      this.lastRoomShown = -1;
      this.showPrompt(true);
      return;
    }

    this.say("특수 이동이지만 현재는 처리되지 않았다.");
  }

  // -----------------------------
  // 기본 상호작용
  has(o: ObjId) {
    return this.inventory.includes(o);
  }

  inven() {
    this.say("현재 가지고 있는 것:");
    for (const o of this.inventory) {
      this.say(`- ${OBJ_DESC[o][1]}`);
      if (o === OBJ.jar && this.jar.length > 0) {
        this.say("  유리병 안에는:");
        for (const j of this.jar) this.say(`    - ${OBJ_DESC[j][1]}`);
      }
    }
  }

  examine(args: string[]) {
    const obj = this.parseObjArg(args);
    if (obj === null) {
      // 방 재서술(긴 설명)
      this.describeRoom();
      return;
    }
    // 존재 확인
    const here = ROOM_OBJECTS[this.currentRoom] || [];
    const jarHas = this.jar.includes(obj) && this.has(OBJ.jar);
    if (
      !(
        here.includes(obj) ||
        (ROOM_SILENTS[this.currentRoom] || []).includes(obj) ||
        this.has(obj) ||
        jarHas
      )
    ) {
      this.say("여기엔 그런 것이 없습니다.");
      return;
    }
    if (obj >= 0) {
      // 특정 특수: 뼈 + 블랙라이트 + 해양구역
      if (obj === OBJ.bone && this.currentRoom === RM.marine && this.black) {
        this.say(
          "이 빛에서 뼈에 글자가 보인다: ‘폭발적인 시간을 원하면 Fourth St.와 Vermont로 가라.’",
        );
        return;
      }
      const d = PHYSOBJ_EXAM[obj];
      this.say(d || "특별한 점이 보이지 않는다.");
    } else if (obj === OBJ.special) {
      // 방 긴 설명
      this.describeRoom();
    } else {
      const d = PERMOBJ_EXAM[Math.abs(obj)];
      this.say(d || "특별한 점이 보이지 않는다.");
    }
  }

  take(args: string[]) {
    const w = this.firstWord(args);
    if (!w) {
      this.say("무엇을 가져올지 말해줘.");
      return;
    }
    if (w === "all") {
      if (this.inBus) {
        this.say("버스 안에서는 아무것도 집을 수 없다.");
        return;
      }
      const here = (ROOM_OBJECTS[this.currentRoom] || []).filter(
        (x) => x >= 0 && x !== OBJ.special,
      );
      if (here.length === 0) {
        this.say("가져갈 게 없다.");
        return;
      }
      for (const x of here) {
        printDOM(OBJ_DESC[x][1] + ": ");
        this.takeObject(x);
      }
      println();
      return;
    }
    const obj = OBJNAME[w];
    if (obj === undefined) {
      this.say("그게 뭔지 모르겠습니다.");
      return;
    }
    if (this.inBus && !(this.has(OBJ.jar) && this.jar.includes(obj))) {
      this.say("버스 안에서는 아무것도 집을 수 없다.");
      return;
    }
    this.takeObject(obj);
  }

  takeObject(obj: ObjId) {
    const here = ROOM_OBJECTS[this.currentRoom] || [];
    // 병 안에 든 걸 꺼내기
    if (this.has(OBJ.jar) && this.jar.includes(obj)) {
      this.say("병에서 꺼냈다.");
      this.jar = this.jar.filter((x) => x !== obj);
      this.inventory.push(obj);
      return;
    }
    if (!here.includes(obj)) {
      if ((ROOM_SILENTS[this.currentRoom] || []).includes(obj)) {
        this.say("그건 가져갈 수 없다.");
        return;
      }
      this.say("여기엔 그런 게 없다.");
      return;
    }
    if (obj < 0) {
      this.say("그건 가져갈 수 없다.");
      return;
    }

    // 무게 제한(원작: 총합 > 11이면 불가)
    const carry = this.inventoryWeight() + OBJ_LBS[obj] + this.jarWeight();
    if (carry > 11) {
      this.say("너무 무겁다.");
      return;
    }

    this.inventory.push(obj);
    this.removeFromRoom(this.currentRoom, obj);
    printDOM("가져왔다. ");
    if (obj === OBJ.towel && this.currentRoom === RM.red46)
      printDOM("수건을 치우자 바닥의 구멍이 드러났다.");
    println();
  }

  inventoryWeight() {
    return this.inventory.reduce((a, o) => a + OBJ_LBS[o], 0);
  }
  jarWeight() {
    return this.jar.reduce((a, o) => a + OBJ_LBS[o], 0);
  }

  drop(args: string[]) {
    if (this.inBus) {
      this.say("버스 안에서는 아무것도 버릴 수 없다.");
      return;
    }
    const obj = this.parseObjArg(args);
    if (obj === null) {
      this.say("무엇을 버릴지 말해줘.");
      return;
    }
    if (!this.has(obj)) {
      this.say("그건 가지고 있지 않다.");
      return;
    }
    this.removeInv(obj);
    this.addToRoom(this.currentRoom, obj);
    this.say("완료.");
    if ([OBJ.food, OBJ.weight, OBJ.jar].includes(obj)) this.dropCheck(obj);
  }

  dropCheck(obj: ObjId) {
    // 곰 먹이
    if (obj === OBJ.food && this.currentRoom === RM.bear_hangout) {
      const here = ROOM_OBJECTS[RM.bear_hangout] || [];
      if (here.includes(OBJ.bear)) {
        this.say("곰이 음식을 들고 도망쳤다. 뭔가 남기고 갔다.");
        this.removeFromRoom(RM.bear_hangout, OBJ.bear);
        this.removeFromRoom(RM.bear_hangout, OBJ.food);
        this.addToRoom(RM.bear_hangout, OBJ.key);
      }
    }
    // 니트로+글리세린 든 병 떨어뜨리기 => 폭발 구멍
    if (
      obj === OBJ.jar &&
      this.jar.includes(OBJ.nitric) &&
      this.jar.includes(OBJ.glycerine)
    ) {
      this.say("병이 바닥에 떨어지며 폭발하여 산산조각났다!");
      this.jar = [];
      this.removeFromRoom(this.currentRoom, OBJ.jar);
      if (this.currentRoom === RM.fourth_vermont) {
        this.holeOpen = true;
        this.currentRoom = RM.vermont_station;
        this.say("폭발로 바닥에 구멍이 생겨 아래로 떨어졌다!");
      }
    }
    // 무게추를 버튼 방에 떨어뜨리기 => 통로 열림 메시지
    if (obj === OBJ.weight && this.currentRoom === RM.maze_button) {
      this.say("통로가 열린다.");
    }
  }

  put(args: string[]) {
    // put A in B
    const a = this.firstWord(args);
    if (!a) {
      this.say("무엇을 넣을지 정해주세요.");
      return;
    }
    const obj1 = OBJNAME[a];
    if (obj1 === undefined) {
      this.say("그게 뭔지 모르겠습니다.");
      return;
    }
    if (!this.has(obj1)) {
      this.say("그건 가지고 있지 않다.");
      return;
    }
    const inIdx = args.findIndex(
      (x) => x === "in" || x === "into" || x === "on" || x === "onto",
    );
    const bWord =
      inIdx >= 0
        ? args.slice(inIdx + 1).find((w) => !IGNORE.has(w))
        : args.slice(1).find((w) => !IGNORE.has(w));
    if (!bWord) {
      this.say("어디에 넣을지 정해주세요.");
      return;
    }
    let obj2 = OBJNAME[bWord];
    if (obj2 === undefined) {
      this.say("그 간접 대상은 모르겠습니다.");
      return;
    }
    // PC 방의 computer -> pc로 치환
    if (obj2 === OBJ.cabinet && this.currentRoom === RM.pc_area) obj2 = OBJ.pc;

    // chute, box, jar, urinal, computer, button/switch/...
    if (obj2 === OBJ.cabinet && obj1 === OBJ.cpu) {
      this.removeInv(OBJ.cpu);
      this.computerOn = true;
      this.say("CPU 보드를 꽂자 컴퓨터가 깨어난다. 불빛이 깜빡이고 팬이 돈다.");
      return;
    }
    if (obj2 === OBJ.button && obj1 === OBJ.weight) {
      return this.drop(["weight"]); // 같은 효과
    }
    if (obj2 === OBJ.jar) {
      if (
        ![
          OBJ.paper,
          OBJ.diamond,
          OBJ.emerald,
          OBJ.license,
          OBJ.coins,
          OBJ.egg,
          OBJ.nitric,
          OBJ.glycerine,
        ].includes(obj1)
      ) {
        this.say("그건 병에 들어가지 않는다.");
        return;
      }
      this.removeInv(obj1);
      this.jar.push(obj1);
      this.say("완료.");
      return;
    }
    if (obj2 === OBJ.chute || obj2 === OBJ.disposal) {
      this.removeInv(obj1);
      this.say("슈트를 타고 멀리 굴러 떨어지는 소리가 들린다.");
      this.putToTreasureRoom([obj1]);
      return;
    }
    if (obj2 === OBJ.box) {
      if (obj1 === OBJ.key) {
        this.say("상자가 흔들리더니 폭발했다! 열쇠는 사라진 듯하다.");
        this.removeInv(obj1);
        this.addToRoom(RM.computer_room, OBJ.key); // 원작: 컴퓨터실로 이동
        this.removeFromRoom(this.currentRoom, OBJ.box);
        this.keyLevel++;
      } else {
        this.say("그건 키 박스에 넣을 수 없다.");
      }
      return;
    }
    if (obj2 === OBJ.pc && obj1 === OBJ.floppy) {
      this.floppyInserted = true;
      this.removeInv(obj1);
      this.say("완료.");
      return;
    }
    if (obj2 === OBJ.urinal) {
      this.removeInv(obj1);
      this.addToRoom(RM.urinal, obj1);
      this.say("물 아래로 ‘퐁’ 하고 떨어지는 소리가 난다.");
      return;
    }
    if (obj2 === OBJ.mail) {
      this.say("우편 슈트는 잠겨 있다.");
      return;
    }
    if (this.has(obj1)) {
      this.say("그렇게 결합하는 방법은 모르겠다. 그냥 떨어뜨려 보는 건?");
    } else {
      this.say("거기에 둘 수 없다.");
    }
  }

  dig() {
    if (this.inBus) {
      this.say("여길 파봐도 아무것도 없다.");
      return;
    }
    if (!this.has(OBJ.shovel)) {
      this.say("팔 도구가 없다.");
      return;
    }
    const d = DIGGABLES[this.currentRoom];
    if (!d) {
      this.say("여길 파봐도 아무것도 없다.");
      return;
    }
    this.say("뭔가를 찾은 것 같다.");
    for (const o of d) this.addToRoom(this.currentRoom, o);
    DIGGABLES[this.currentRoom] = null;
  }

  climb(args: string[]) {
    const obj = this.parseObjArg(args);
    if (obj === null) {
      this.say("무엇을 오를지 모르겠다.");
      return;
    }
    const here = ROOM_SILENTS[this.currentRoom] || [];
    if (obj !== OBJ.tree && obj !== OBJ.special) {
      this.say("그건 오를 수 없다.");
      return;
    }
    if (obj === OBJ.special && !here.includes(OBJ.tree)) {
      this.say("여기서 오를만한 게 없다.");
      return;
    }
    this.say("나무를 두 피트쯤 오르다 떨어졌다. 나무가 매우 불안정하다.");
  }

  shake(args: string[]) {
    const obj = this.parseObjArg(args);
    if (obj === null) {
      this.say("대상을 지정해줘.");
      return;
    }
    if (this.has(obj)) {
      this.say(`${ko.objName(obj)} 을(를) 흔들어도 변화가 없다.`);
      return;
    }
    const here = (ROOM_OBJECTS[this.currentRoom] || []).concat(
      ROOM_SILENTS[this.currentRoom] || [],
    );
    if (!here.includes(obj)) {
      this.say("여기엔 그런 게 없다.");
      return;
    }
    if (obj === OBJ.tree) {
      this.say("나무를 흔드니 코코넛이 떨어져 머리를 강타했다.");
      this.die("코코넛");
      return;
    }
    if (obj === OBJ.bear) {
      this.say("곰에게 다가가자 네 머리를 떼어 바닥에 올려놓는다.");
      this.die("곰");
      return;
    }
    if (obj < 0) {
      this.say("그건 흔들 수 없다.");
      return;
    }
    this.say("그건 가지고 있지 않다.");
  }

  eat(args: string[]) {
    const obj = this.parseObjArg(args);
    if (obj === null) {
      this.say("무엇을 먹을지 지정해줘.");
      return;
    }
    if (!this.has(obj)) {
      this.say("그건 가지고 있지 않다.");
      return;
    }
    if (obj !== OBJ.food) {
      this.say(`${ko.objName(obj)} 을(를) 억지로 삼키려다 질식했다.`);
      this.die("질식");
      return;
    }
    this.say("끔찍한 맛이었다.");
    this.removeInv(OBJ.food);
  }

  press(args: string[]) {
    const obj = this.parseObjArg(args);
    if (obj === null) {
      this.say("무엇을 누를지 지정해줘.");
      return;
    }
    const here = (ROOM_OBJECTS[this.currentRoom] || []).concat(
      ROOM_SILENTS[this.currentRoom] || [],
    );
    if (!here.includes(obj)) {
      this.say("여기엔 그런 게 없다.");
      return;
    }
    if (obj !== OBJ.button && obj !== OBJ.swtch) {
      this.say("그건 누를 수 없다.");
      return;
    }
    if (obj === OBJ.button) {
      this.say("버튼을 누르자 통로가 열리는 듯하지만, 손을 떼면 닫힌다.");
    } else {
      if (this.black) {
        this.say("스위치를 끄는 위치로 두었다.");
        this.black = false;
      } else {
        this.say("스위치를 켰다.");
        this.black = true;
      }
    }
  }

  turn(args: string[]) {
    const obj = this.parseObjArg(args);
    if (obj === null) {
      this.say("무엇을 돌릴지 지정해줘.");
      return;
    }
    const here = (ROOM_OBJECTS[this.currentRoom] || []).concat(
      ROOM_SILENTS[this.currentRoom] || [],
    );
    if (!here.includes(obj)) {
      this.say("여기엔 그런 게 없다.");
      return;
    }
    if (obj !== OBJ.dial) {
      this.say("그건 돌릴 수 없다.");
      return;
    }
    const dir = this.firstWord(args.slice(1));
    if (dir !== "clockwise" && dir !== "counterclockwise") {
      this.say(
        "시계방향(clockwise) 또는 반시계방향(counterclockwise)으로 지정해줘.",
      );
      return;
    }
    if (dir === "clockwise") this.saunaLevel++;
    else this.saunaLevel--;
    if (this.saunaLevel < 0) {
      this.saunaLevel = 0;
      this.say("그 방향으로는 더 돌지 않는다.");
      return;
    }
    // 온도 효과
    if (this.saunaLevel === 4) {
      this.say("딸깍! 즉시 불타올랐다.");
      this.die("화염");
      return;
    }
    this.specialObjectDescribe();
  }

  swim() {
    if (!(this.currentRoom === RM.lake_n || this.currentRoom === RM.lake_s)) {
      this.say("물은 보이지 않는다!");
      return;
    }
    if (!this.has(OBJ.life)) {
      this.say("차가운 물에 뛰어들었다… 수영을 못 한다는 걸 깨달았다.");
      this.die("익사");
      return;
    }
    if (this.currentRoom === RM.lake_n) this.currentRoom = RM.lake_s;
    else this.currentRoom = RM.lake_n;
    this.lastRoomShown = -1;
    this.showPrompt(true);
  }

  sleep() {
    if (this.currentRoom !== RM.bedroom) {
      this.say("여기서는 서서 자려 해도 잠들 수 없다.");
      return;
    }
    this.gotToiletNeed = true;
    this.say(
      "꿈을 꾼다… 너는 작업자들 사이에서 몰래 빠져나와, 말굽 모양 돌이 있는 방에서 구멍을 파 보물을 묻고 다시 흙을 덮는다… 곧 깨어났다.",
    );
  }

  piss() {
    if (this.currentRoom !== RM.bathroom) {
      this.say("여기선 그러지 마…");
      return;
    }
    if (!this.gotToiletNeed) {
      this.say("지금은 볼일이 없다.");
      return;
    }
    this.say("상쾌했다.");
    this.gotToiletNeed = false;
    this.addToRoom(RM.urinal, OBJ.URINE);
  }

  flush() {
    if (this.currentRoom !== RM.bathroom) {
      this.say("여기엔 내릴 것이 없다.");
      return;
    }
    this.say("휘이이잉!!");
    const objs = ROOM_OBJECTS[RM.urinal] || [];
    if (objs.length > 0) this.putToTreasureRoom(objs);
    ROOM_OBJECTS[RM.urinal] = [];
  }

  breakObj(args: string[]) {
    if (!this.has(OBJ.axe)) {
      this.say("부술 도구가 없다.");
      return;
    }
    const obj = this.parseObjArg(args);
    if (obj === null) {
      this.say("무엇을 부술지 지정해줘.");
      return;
    }
    if (this.has(obj)) {
      this.say("도끼를 휘두르다 손을 베어 피를 흘리며 쓰러졌다.");
      this.die("도끼");
      return;
    }
    const here = (ROOM_OBJECTS[this.currentRoom] || []).concat(
      ROOM_SILENTS[this.currentRoom] || [],
    );
    if (!here.includes(obj)) {
      this.say("여기엔 그런 게 없다.");
      return;
    }
    if (obj === OBJ.cable) {
      this.say(
        "이더넷 케이블을 끊자 모든 것이 흐려지고… 눈떠보니 pokey 콘솔 앞.",
      );
      // 인벤토리를 컴퓨터실로 이동(열쇠 제외)
      const keepKey = this.has(OBJ.key);
      const move = this.inventory.slice();
      this.inventory = keepKey ? [OBJ.key] : [];
      for (const x of move) {
        if (keepKey && x === OBJ.key) continue;
        this.addToRoom(RM.gamma, x);
      }
      if (!keepKey) this.removeFromRoom(RM.gamma, OBJ.key);
      this.currentRoom = RM.computer_room;
      this.ethernet = false;
      this.say("Connection closed.");
      this.typeOn(); // 유닉스 콘솔로
      return;
    }
    if (obj < 0) {
      this.say("도끼가 산산조각났다.");
      this.removeInv(OBJ.axe);
      return;
    }
    this.say("도끼로 산산조각냈다.");
    this.removeFromRoom(this.currentRoom, obj);
  }

  drive() {
    if (!this.inBus) this.say("차량 안이 아니면 운전할 수 없다.");
    else this.say("버스 안에서 이동은 방향 명령으로 하라.");
  }

  feed(args: string[]) {
    const obj = this.parseObjArg(args);
    if (
      obj === OBJ.bear &&
      (ROOM_OBJECTS[this.currentRoom] || []).includes(OBJ.bear)
    ) {
      if (!this.has(OBJ.food)) this.say("먹일 것이 없다.");
      else this.drop(["food"]);
      return;
    }
    const here = (ROOM_OBJECTS[this.currentRoom] || []).concat(
      ROOM_SILENTS[this.currentRoom] || [],
    );
    if (!obj || (!here.includes(obj) && !this.has(obj))) {
      this.say("여기엔 그런 게 없다.");
      return;
    }
    this.say("그건 먹여서 뭐가 되지 않는다.");
  }

  // -----------------------------
  // 점수
  regScore() {
    let t = 0;
    const tre = ROOM_OBJECTS[RM.treasure] || [];
    for (const x of tre) {
      if (x >= 0) t += OBJ_PTS[x];
    }
    if ((ROOM_OBJECTS[RM.treasure] || []).includes(OBJ.URINE)) t = 0;
    return t;
  }
  endScore() {
    let t = 0;
    const arr = ROOM_OBJECTS[RM.end_treasure] || [];
    for (const x of arr) {
      if (x >= 0) t += OBJ_PTS[x];
    }
    return t;
  }
  score() {
    if (!this.inEndgame) {
      const s = this.regScore();
      this.say(`현재 점수: ${s} / 90`);
      return s;
    } else {
      const s = this.endScore();
      this.say(`엔드게임 점수: ${s} / 110`);
      if (s === 110)
        this.say("\n축하합니다! 승리했습니다. 마법사 비밀번호는 ‘moby’");
      return s;
    }
  }

  // -----------------------------
  // 엔드게임
  answer(args: string[]) {
    if (!this.correctAnswer) {
      this.say("지금은 누가 묻지 않았다.");
      return;
    }
    const a = this.firstWord(args);
    if (!a) {
      this.say("같은 줄에 답을 써야 한다.");
      return;
    }
    if (this.correctAnswer.includes(a)) {
      this.say("정답이다.");
      // 마지막 방향 반대로 한 칸
      if (this.lastDir === DIR.N) this.currentRoom++;
      else this.currentRoom--;
      this.correctAnswer = null;
      this.endQCurrent = null;
      this.lastRoomShown = -1;
      this.showPrompt(true);
    } else {
      this.say("오답이다.");
    }
  }

  endgameQuestion() {
    if (this.endQuestionsPool.length === 0) {
      this.say("너의 질문은:");
      this.say("더 이상 질문 없음. 그냥 ‘answer foo’");
      this.correctAnswer = ["foo"];
      return;
    }
    const i = randInt(0, this.endQuestionsPool.length - 1);
    const item = this.endQuestionsPool.splice(i, 1)[0];
    this.endQCurrent = item;
    this.correctAnswer = item.a;
    this.say("너의 질문은:");
    this.say(item.q);
  }

  // -----------------------------
  // 시스템/인터페이스
  typeOn() {
    if (this.currentRoom !== RM.computer_room) {
      this.say("타이핑할 콘솔이 없다.");
      return;
    }
    if (!this.computerOn) {
      this.say("키보드를 두드려도 에코가 없다.");
      return;
    }
    // 로그인
    this.unixLogin();
  }

  unixLogin() {
    // 간소화: 프롬프트 대체 안내
    if (this.unixLoggedIn) {
      this.mode = "unix";
      this.showPrompt();
      return;
    }
    this.say("\nUNIX System V, Release 2.2 (pokey)\n");
    this.say("login: toukmond");
    this.say("password: robert");
    this.say(
      "\nWelcome to Unix\n파일시스템이 가득 찼습니다. 디렉토리를 정리하세요.\n" +
        "gamma 와의 tcp/ip 링크가 불안정합니다. ftp는 홈디렉토리에서만 보내며, 보낸 뒤 파일을 삭제합니다!\n" +
        "주의: restricted bourne shell 사용 중.\n",
    );
    this.unixLoggedIn = true;
    this.mode = "unix";
    this.showPrompt();
  }

  power() {
    if (this.currentRoom !== RM.pc_area) {
      this.say("여기서는 해당 없음.");
      return;
    }
    if (!this.floppyInserted) {
      this.say("부팅 디스크(플로피)가 없다.");
      return;
    }
    // DOS 인터페이스
    this.mode = "dos";
    this.say("현재 시각은 ?? (무시)\n새 시각 입력: (무시)\n");
    this.showPrompt();
  }

  // -----------------------------
  // 유닉스 명령
  unix_pwd() {
    this.say(this.unixCdPath);
  }
  unix_ls(args: string[]) {
    if (args.length > 0) {
      const oldPath = this.unixCdPath,
        oldRoom = this.unixCdRoom;
      const ok = this.unix_cd(args, /*silent*/ true) === true;
      if (ok) this.unix_ls([]); // 재귀
      this.unixCdPath = oldPath;
      this.unixCdRoom = oldRoom;
      return;
    }
    if (this.unixCdRoom === -10) return this.unix_ls_inven();
    if (this.unixCdRoom === -2) return this.unix_ls_rooms();
    if (this.unixCdRoom === -3) return this.unix_ls_root();
    if (this.unixCdRoom === -4) return this.unix_ls_usr();
    if (this.unixCdRoom > 0) return this.unix_ls_room();
  }
  unix_ls_root() {
    this.say(
      "total 4\n" +
        "drwxr-xr-x 3 root staff 512 Jan 1 1970 .\n" +
        "drwxr-xr-x 3 root staff 2048 Jan 1 1970 ..\n" +
        "drwxr-xr-x 3 root staff 2048 Jan 1 1970 usr\n" +
        "drwxr-xr-x 3 root staff 2048 Jan 1 1970 rooms",
    );
  }
  unix_ls_usr() {
    this.say(
      "total 4\n" +
        "drwxr-xr-x 3 root staff 512 Jan 1 1970 .\n" +
        "drwxr-xr-x 3 root staff 2048 Jan 1 1970 ..\n" +
        "drwxr-xr-x 3 toukmond restricted 512 Jan 1 1970 toukmond",
    );
  }
  unix_ls_rooms() {
    let s =
      "total 16\n" +
      "drwxr-xr-x 3 root staff 512 Jan 1 1970 .\n" +
      "drwxr-xr-x 3 root staff 2048 Jan 1 1970 ..\n";
    for (const x of this.visited) {
      s += `drwxr-xr-x 3 root staff 512 Jan 1 1970 ${ROOMS[x].short.replace(/\s+/g, "-").toLowerCase()}\n`;
    }
    this.say(s.trimEnd());
  }
  unix_ls_room() {
    let s =
      "total 4\n" +
      "drwxr-xr-x 3 root staff 512 Jan 1 1970 .\n" +
      "drwxr-xr-x 3 root staff 2048 Jan 1 1970 ..\n" +
      "-rwxr-xr-x 3 root staff 2048 Jan 1 1970 description\n";
    const obj = ROOM_OBJECTS[this.unixCdRoom] || [];
    obj.forEach((o) => {
      if (o >= 0 && o !== OBJ.special) {
        s += `-rwxr-xr-x 1 toukmond restricted 0 Jan 1 1970 ${OBJ_FILES[o]}\n`;
      }
    });
    this.say(s.trimEnd());
  }
  unix_ls_inven() {
    let s =
      "total 467\n" +
      "drwxr-xr-x 3 toukmond restricted 512 Jan 1 1970 .\n" +
      "drwxr-xr-x 3 root staff 2048 Jan 1 1970 ..\n";
    [
      "ls",
      "ftp",
      "echo",
      "exit",
      "cd",
      "pwd",
      "rlogin",
      "ssh",
      "uncompress",
      "cat",
    ].forEach((cmd) => {
      s += `-rwxr-xr-x 1 toukmond restricted 10423 Jan 1 1970 ${cmd}\n`;
    });
    if (!this.unixUncompressed)
      s += "-rwxr-xr-x 1 toukmond restricted 0 Jan 1 1970 paper.o.Z\n";
    for (const x of this.inventory) {
      s += `-rwxr-xr-x 1 toukmond restricted 0 Jan 1 1970 ${OBJ_FILES[x]}\n`;
    }
    this.say(s.trimEnd());
  }

  unix_cd(args: string[], silent = false) {
    if (args.length === 0) {
      if (!silent) this.say("사용법: cd <path>");
      return false;
    }
    let path = args[0];
    const savePath = this.unixCdPath,
      saveRoom = this.unixCdRoom;
    const go = (p: string) => {
      if (p === "/") {
        this.unixCdPath = "/";
        this.unixCdRoom = -3;
        return true;
      }
      const seg = p.split("/").filter(Boolean);
      for (const name of seg) {
        if (name === ".") continue;
        if (name === "..") {
          if (this.unixCdRoom > 0) {
            this.unixCdPath = "/rooms";
            this.unixCdRoom = -2;
          } else if (
            this.unixCdRoom === -2 ||
            this.unixCdRoom === -4 ||
            this.unixCdRoom === -3
          ) {
            this.unixCdPath = "/";
            this.unixCdRoom = -3;
          } else if (this.unixCdRoom === -10) {
            this.unixCdPath = "/usr";
            this.unixCdRoom = -4;
          }
        } else {
          if (this.unixCdRoom === -4) {
            if (name === "toukmond") {
              this.unixCdPath = "/usr/toukmond";
              this.unixCdRoom = -10;
            } else {
              if (!silent) this.say("그런 디렉토리는 없다.");
              return false;
            }
          } else if (this.unixCdRoom === -10) {
            if (!silent) this.say("그런 디렉토리는 없다.");
            return false;
          } else if (this.unixCdRoom > 0) {
            if (!silent) this.say("그런 디렉토리는 없다.");
            return false;
          } else if (this.unixCdRoom === -3) {
            if (name === "rooms") {
              this.unixCdPath = "/rooms";
              this.unixCdRoom = -2;
            } else if (name === "usr") {
              this.unixCdPath = "/usr";
              this.unixCdRoom = -4;
            } else {
              if (!silent) this.say("그런 디렉토리는 없다.");
              return false;
            }
          } else if (this.unixCdRoom === -2) {
            // 방문한 방 단축명
            const match = Array.from(this.visited).find(
              (x) => ROOMS[x].short.replace(/\s+/g, "-").toLowerCase() === name,
            );
            if (match === undefined) {
              if (!silent) this.say("그런 디렉토리는 없다.");
              return false;
            } else {
              this.unixCdPath = `/rooms/${name}`;
              this.unixCdRoom = match;
            }
          }
        }
      }
      return true;
    };
    const ok = go(path);
    if (!ok) {
      this.unixCdPath = savePath;
      this.unixCdRoom = saveRoom;
    }
    return ok;
  }

  unix_echo(args: string[]) {
    const out = args
      .map((x) => {
        if (x.startsWith("$")) return "";
        return x;
      })
      .join(" ");
    this.say(out);
  }

  unix_uncompress(args: string[]) {
    if (args.length === 0) {
      this.say("사용법: uncompress <filename>");
      return;
    }
    const f = args[0];
    if (
      this.unixUncompressed ||
      (f !== "paper.o" && f !== "paper.o.z" && f !== "paper.o.Z")
    ) {
      this.say("Uncompress 실패.");
      return;
    }
    this.unixUncompressed = true;
    this.inventory.push(OBJ.paper);
  }

  unix_cat(args: string[]) {
    if (args.length === 0) {
      this.say("사용법: cat <ascii-file-name>");
      return;
    }
    const f = args[0];
    if (f.includes("/")) {
      this.say("cat: 현재 디렉토리 파일만 가능.");
      return;
    }
    if (this.unixCdRoom > 0 && f === "description") {
      this.say(ROOMS[this.unixCdRoom].long);
      return;
    }
    const doto = f.indexOf(".o");
    if (doto >= 0) {
      const checklist =
        this.unixCdRoom === -10
          ? this.inventory
          : ROOM_OBJECTS[this.unixCdRoom] || [];
      const obj = OBJNAME[f.slice(0, doto)];
      if (obj === undefined || !checklist.includes(obj)) {
        this.say("파일을 찾을 수 없음.");
        return;
      }
      this.say("Ascii 파일만 가능.");
      return;
    }
    this.say("파일을 찾을 수 없음.");
  }

  unix_net(cmd: string, args: string[]) {
    if (args.length === 0) {
      this.say(`${cmd}: 호스트명 필요.`);
      return;
    }
    const host = args[0];
    if (host !== "gamma" && host !== "endgame" && host !== "pokey") {
      this.say(`${cmd}: Unknown host.`);
      return;
    }
    if (host === "endgame") {
      this.say(`${cmd}: endgame 으로의 연결은 허용되지 않음.`);
      return;
    }
    if (!this.ethernet) {
      this.say(`${cmd}: host not responding.`);
      return;
    }

    if (cmd === "ftp") {
      // ftp 시뮬
      this.say("Connected to gamma. FTP ver 0.9 00:00:00 01/01/70");
      this.say("Username: anonymous");
      this.say("Guest login okay, user access restrictions apply.");
      // ftp> 루프는 간략화 — 필요한 퍼즐만: send, type, ascii/binary, quit
      this.say("ftp> (간략화) 'type binary|ascii', 'send <파일>', 'quit' 지원");
      // 게임 로직상: send paper.o.Z를 ascii로 보내면 receiving room에 protoplasm가 생김,
      // binary로 보내면 실제 오브젝트 이동. 여기서는 send <obj>.o 처리.
      this.say("힌트: 달걀/보물 파일을 send 하면 수취실로 간다.");
      return;
    }
    if (cmd === "rlogin" || cmd === "ssh") {
      if (host === "pokey") {
        this.say("localhost 로 rlogin 불가");
        return;
      }
      // gamma로 rlogin => 비밀번호 worms 필요. 성공 시 인벤토리 잃고 수취실로 워프.
      this.say("Password: worms");
      this.say("\n순간적으로 이상한 기분이 들더니 소지품을 잃는다.");
      const backup = this.inventory.slice();
      for (const o of backup) {
        this.addToRoom(RM.computer_room, o);
      }
      this.inventory = [];
      this.currentRoom = RM.receiving_room;
      this.mode = "dungeon";
      this.say("콘솔에서 물러선다.");
      this.lastRoomShown = -1;
      this.showPrompt(true);
      return;
    }
  }

  // -----------------------------
  // DOS
  dos_dir(args: string[]) {
    if (args.length === 0 || args[0] === "\\") {
      this.say(
        `
 Volume in drive A is FOO
 Volume Serial Number is 1A16-08C9
 Directory of A:\\

COMMAND  COM     47845 04-09-91   2:00a
FOO      TXT        40 01-20-93   1:01a
        2 file(s)      47845 bytes
                     1065280 bytes free`.trim(),
      );
    } else {
      this.say(
        `
 Volume in drive A is FOO
 Volume Serial Number is 1A16-08C9
 Directory of A:\\

File not found`.trim(),
      );
    }
  }
  dos_type(args: string[]) {
    if (args.length === 0) {
      this.say("Must supply file name");
      return;
    }
    const f = args[0].toLowerCase();
    if (f === "foo.txt") {
      this.say(`\n조합(combination)은 ${this.combination} 입니다.`);
      return;
    }
    if (f === "command.com") {
      this.say("Cannot type binary files");
      return;
    }
    this.say("File not found - " + f.toUpperCase());
  }

  // -----------------------------
  // 저장/복구
  save(args: string[]) {
    const name = this.firstWord(args);
    if (!name) {
      this.say("save <이름> 형태로 저장하세요.");
      return;
    }
    const data = JSON.stringify({
      currentRoom: this.currentRoom,
      visited: [...this.visited],
      inventory: this.inventory,
      inBus: this.inBus,
      nomail: this.nomail,
      jar: this.jar,
      black: this.black,
      inEndgame: this.inEndgame,
      endQuestionsPool: this.endQuestionsPool,
      endQCurrent: this.endQCurrent,
      correctAnswer: this.correctAnswer,
      lastDir: this.lastDir,
      saunaLevel: this.saunaLevel,
      computerOn: this.computerOn,
      floppyInserted: this.floppyInserted,
      keyLevel: this.keyLevel,
      holeOpen: this.holeOpen,
      ethernet: this.ethernet,
      floppyMelted: this.floppyMelted,
      numCmds: this.numCmds,
      unix: {
        loggedIn: this.unixLoggedIn,
        cdRoom: this.unixCdRoom,
        cdPath: this.unixCdPath,
        uncompressed: this.unixUncompressed,
        ft: this.unixFTType,
      },
      eggLoc: this.eggLoc,
      combination: this.combination,
      roomObjects: ROOM_OBJECTS, // NOTE: 원작은 파일로 저장/rot13. 여기선 JSON 통째로 저장.
    });
    try {
      localStorage.setItem(`dunnet-save:${name}`, data);
      this.say("저장 완료.");
    } catch (e) {
      this.say("저장 실패.");
    }
  }
  restore(args: string[]) {
    const name = this.firstWord(args);
    if (!name) {
      this.say("restore <이름> 형태로 복구하세요.");
      return;
    }
    const s = localStorage.getItem(`dunnet-save:${name}`);
    if (!s) {
      this.say("복구 파일을 찾지 못했다.");
      return;
    }
    try {
      const d = JSON.parse(s);
      this.currentRoom = d.currentRoom;
      this.visited = new Set<number>(d.visited);
      this.inventory = d.inventory;
      this.inBus = d.inBus;
      this.nomail = d.nomail;
      this.jar = d.jar;
      this.black = d.black;
      this.inEndgame = d.inEndgame;
      this.endQuestionsPool = d.endQuestionsPool;
      this.endQCurrent = d.endQCurrent;
      this.correctAnswer = d.correctAnswer;
      this.lastDir = d.lastDir;
      this.saunaLevel = d.saunaLevel;
      this.computerOn = d.computerOn;
      this.floppyInserted = d.floppyInserted;
      this.keyLevel = d.keyLevel;
      this.holeOpen = d.holeOpen;
      this.ethernet = d.ethernet;
      this.floppyMelted = d.floppyMelted;
      this.numCmds = d.numCmds;
      this.unixLoggedIn = d.unix.loggedIn;
      this.unixCdRoom = d.unix.cdRoom;
      this.unixCdPath = d.unix.cdPath;
      this.unixUncompressed = d.unix.uncompressed;
      this.unixFTType = d.unix.ft;
      this.eggLoc = d.eggLoc;
      this.combination = d.combination;
      // 방 오브젝트 복구
      for (let i = 0; i < ROOM_OBJECTS.length; i++) {
        ROOM_OBJECTS[i] = d.roomObjects[i];
      }
      this.say("복구 완료.");
      this.lastRoomShown = -1;
      this.showPrompt(true);
    } catch (e) {
      this.say("복구 실패.");
    }
  }

  // -----------------------------
  // 도움말/종료/사망
  help() {
    this.say(
      "환영합니다! dunnet(2.02) 브라우저 포팅.\n" +
        "- 열쇠가 있으면 문을 명시적으로 열 필요 없이 해당 방향으로 이동하면 됨.\n" +
        "- 램프가 있으면 항상 켜져 있다고 가정.\n" +
        "- 보물을 ‘특정 장소(슈트/소변기 플러시 등)’로 **무사히** 보내야 점수가 오른다.\n" +
        "- 저장/복구: save <이름>, restore <이름> (localStorage 사용)\n" +
        "- 방향: north/south/east/west, northeast/southeast/northwest/southwest, up/down, in/out\n" +
        "  (약어: n,s,e,w,ne,se,nw,sw,u,d,in,out)\n" +
        "- 기타: look/x, inventory/i, take/get, drop, put A in B, dig, eat, press/push, turn dial clockwise,\n" +
        "        climb, shake, break, swim, sleep, piss, flush, score, help, quit\n" +
        "- 컴퓨터실(type) → 유닉스 셸($), PC 구역(reset) → DOS(A>)\n",
    );
  }

  quit() {
    this.die();
  }

  die(withMsg?: string) {
    this.dead = true;
    this.say("죽었다.");
    if (withMsg) console.log(withMsg);
    this.score();
  }

  // -----------------------------
  // 공용 조작
  addToRoom(r: RoomId, obj: ObjId) {
    const a = ROOM_OBJECTS[r] || [];
    ROOM_OBJECTS[r] = [...a, obj];
  }
  removeFromRoom(r: RoomId, obj: ObjId) {
    const a = ROOM_OBJECTS[r] || [];
    ROOM_OBJECTS[r] = a.filter((x) => x !== obj);
  }
  removeInv(obj: ObjId) {
    this.inventory = this.inventory.filter((x) => x !== obj);
  }

  putToTreasureRoom(objs: ObjId[]) {
    const before = this.regScore();
    for (const o of objs) this.addToRoom(RM.treasure, o);
    const after = this.regScore();
    if (after !== before) this.score();
  }
}

// ------------------------------------
// 부트스트랩
const game = new Game();
(game as any).debug = { MAP, ROOM_OBJECTS, ROOM_SILENTS }; // 디버깅 노출(선택)

// UI
$send.addEventListener("click", () => {
  const line = $cmd.value;
  $cmd.value = "";
  println(line); // 입력 에코
  try {
    game.handle(line);
  } catch (e) {
    println(`(오류) ${e}`);
  } finally {
    game.showPrompt();
  }
});
$cmd.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    $send.click();
  }
});

// 시작 방 안내(원작은 dead_end=1)
game.lastRoomShown = -1;
game.showPrompt(true);
