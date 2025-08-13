/**
 * dunnet.ts — TypeScript port of the Emacs game "dunnet.el"
 *
 * Original copyright:
 *   Copyright (C) 1992-1993, 2001-2017 Free Software Foundation, Inc.
 *   Author: Ron Schnell <ronnie@driver-aces.com>
 *   Version: 2.02
 *   License: GNU GPL v3 or later
 *
 * Porting notes:
 * - Emacs Lisp identifiers with '-' are converted to TypeScript identifiers with '_'.
 * - Emacs-specific UI (buffer, keymaps, minibuffer) replaced with a simple browser UI:
 *   output <pre> and single-line <input>. See initDunnet() below.
 * - Functions that synchronously read input (e.g., dun_read_line in UNIX/DOS subgames)
 *   use window.prompt() to keep the synchronous flow (browser adaptation).
 * - File I/O for save/restore/log is mapped to localStorage (see dun_save_game, dun_restore, dun_do_logfile).
 * - Batch-mode and keyboard-map specific code is omitted or neutralized.
 * - Heavy/repetitive data moved to JSON modules imported below.
 */

// IMPORTANT: You need TS compiler option: "resolveJsonModule": true
// and an ESM-capable bundler (Vite, webpack, etc.) to import JSON.

import roomsJson from "./data/rooms.json" assert { type: "json" };
import dungeonMapJson from "./data/dungeonMap.json" assert { type: "json" };
import lightRoomsJson from "./data/lightRooms.json" assert { type: "json" };
import objnamesJson from "./data/objnames.json" assert { type: "json" };
import objectsJson from "./data/objects.json" assert { type: "json" };
import objectLbsJson from "./data/objectLbs.json" assert { type: "json" };
import objectPtsJson from "./data/objectPts.json" assert { type: "json" };
import objfilesJson from "./data/objfiles.json" assert { type: "json" };
import permObjectsJson from "./data/permObjects.json" assert { type: "json" };
import permobjDescJson from "./data/permobjDesc.json" assert { type: "json" };
import physobjDescJson from "./data/physobjDesc.json" assert { type: "json" };
import roomObjectsInitJson from "./data/roomObjects.json" assert { type: "json" };
import roomSilentsInitJson from "./data/roomSilents.json" assert { type: "json" };
import diggablesInitJson from "./data/diggables.json" assert { type: "json" };
import endgameQuestionsInitJson from "./data/endgameQuestions.json" assert { type: "json" };

/* ---------------- Types derived from JSON ---------------- */

type RoomDef = [string, string]; // [longDescription, shortTitle]
const dun_rooms: RoomDef[] = roomsJson as RoomDef[];

type DungeonMap = number[][];
const dungeon_map: DungeonMap = dungeonMapJson as number[][];

const dun_light_rooms: number[] = lightRoomsJson as number[];

type ObjNamePair = [string, number]; // [name, id]
const dun_objnames_list: ObjNamePair[] = objnamesJson as ObjNamePair[];
const dun_objects: [string, string][] = objectsJson as [string, string][];
const dun_object_lbs: number[] = objectLbsJson as number[];
const dun_object_pts: number[] = objectPtsJson as number[];
const dun_objfiles: string[] = objfilesJson as string[];
const dun_perm_objects: (string | null)[] = permObjectsJson as (
  | string
  | null
)[];
const dun_permobj_desc: (string | null)[] = permobjDescJson as (
  | string
  | null
)[];
const dun_physobj_desc: (string | null)[] = physobjDescJson as (
  | string
  | null
)[];

let dun_room_objects: number[][] = (roomObjectsInitJson as number[][]).map(
  (arr) => [...(arr ?? [])],
);
let dun_room_silents: number[][] = (roomSilentsInitJson as number[][]).map(
  (arr) => [...(arr ?? [])],
);
let dun_diggables: (number[] | null)[] = (
  diggablesInitJson as (number[] | null)[]
).map((v) => (v ? [...v] : null));
let dun_endgame_questions: string[][] = (
  endgameQuestionsInitJson as string[][]
).map((arr) => [...arr]);

/* --------------- Utility: build maps/constants --------------- */

const obj_special = 255; // Emacs 'obj-special'

const dun_objnames = new Map<string, number>(dun_objnames_list);

/** For convenience: define constants for canonical names used in logic */
const obj_shovel = dun_objnames.get("shovel")!;
const obj_lamp = dun_objnames.get("lamp")!;
const obj_cpu = dun_objnames.get("cpu")!;
const obj_food = dun_objnames.get("food")!;
const obj_key = dun_objnames.get("key")!;
const obj_paper = dun_objnames.get("paper")!;
const obj_rms = dun_objnames.get("rms")!;
const obj_diamond = dun_objnames.get("diamond")!;
const obj_weight = dun_objnames.get("weight")!;
const obj_life = dun_objnames.get("life")!;
const obj_bracelet = dun_objnames.get("bracelet")!;
const obj_gold = dun_objnames.get("gold")!;
const obj_platinum = dun_objnames.get("platinum")!;
const obj_towel = dun_objnames.get("towel")!;
const obj_axe = dun_objnames.get("axe")!;
const obj_silver = dun_objnames.get("silver")!;
const obj_license = dun_objnames.get("license")!;
const obj_coins = dun_objnames.get("coins")!;
const obj_egg = dun_objnames.get("egg")!;
const obj_jar = dun_objnames.get("jar")!;
const obj_bone = dun_objnames.get("bone")!;
const obj_nitric = dun_objnames.get("nitric")!;
const obj_glycerine = dun_objnames.get("glycerine")!;
const obj_ruby = dun_objnames.get("ruby")!;
const obj_amethyst = dun_objnames.get("amethyst")!;
const obj_mona = dun_objnames.get("mona")!;
const obj_bill = dun_objnames.get("bill")!;
const obj_floppy = dun_objnames.get("floppy")!;

// negative/perm objects (appear in room or as silents)
const obj_boulder = dun_objnames.get("boulder")!;
const obj_tree = dun_objnames.get("tree")!;
const obj_bear = dun_objnames.get("bear")!;
const obj_bin = dun_objnames.get("bin")!;
const obj_computer = dun_objnames.get("computer")!;
const obj_protoplasm = dun_objnames.get("protoplasm")!;
const obj_dial = dun_objnames.get("dial")!;
const obj_button = dun_objnames.get("button")!;
const obj_chute = dun_objnames.get("chute")!;
const obj_painting = dun_objnames.get("painting")!;
const obj_bed = dun_objnames.get("bed")!;
const obj_urinal = dun_objnames.get("urinal")!;
const obj_URINE = dun_objnames.get("URINE")!;
const obj_pipes = dun_objnames.get("pipes")!;
const obj_box = dun_objnames.get("box")!;
const obj_cable = dun_objnames.get("cable")!;
const obj_mail = dun_objnames.get("mail")!;
const obj_bus = dun_objnames.get("bus")!;
const obj_gate = dun_objnames.get("gate")!;
const obj_cliff = dun_objnames.get("cliff")!;
const obj_dinosaur = dun_objnames.get("dinosaur")!;
const obj_fish = dun_objnames.get("fish")!;
const obj_tanks = dun_objnames.get("tanks")!;
const obj_switch = dun_objnames.get("switch")!;
const obj_blackboard = dun_objnames.get("blackboard")!;
const obj_disposal = dun_objnames.get("disposal")!;
const obj_ladder = dun_objnames.get("ladder")!;
const obj_subway = dun_objnames.get("subway")!;
const obj_pc = dun_objnames.get("pc")!;
const obj_coconut = dun_objnames.get("coconut")!;
const obj_lake = dun_objnames.get("lake")!;

/** Build room shorts and named constants (underscored) */
function space_to_hyphen(s: string) {
  return s.replace(/[ /]/g, "-").toLowerCase();
}
const dun_room_shorts: string[] = dun_rooms.map((r) => space_to_hyphen(r[1]));
const R: Record<string, number> = {};
dun_room_shorts.forEach((name, idx) => {
  R[name.replace(/-/g, "_")] = idx;
});

// frequently used room constants (underscore names)
const treasure_room = R["treasure_room"];
const computer_room = R["computer_room"];
const red_room = R["red_room"];
const bear_hangout = R["bear_hangout"];
const marine_life_area = R["marine_life_area"];
const fourth_vermont_intersection = R["fourth_vermont_intersection"];
const vermont_station = R["vermont_station"];
const museum_station = R["museum_station"];
const maze_button_room = R["maze_button_room"];
const weight_room = R["weight_room"];
const pc_area = R["pc_area"];
const receiving_room = R["receiving_room"];
const building_front = R["building_front"];
const old_building_hallway = R["old_building_hallway"];
const meadow = R["meadow"];
const north_end_of_cave_passage = R["north_end_of_cave_passage"];
const gamma_computing_center = R["gamma_computing_center"];
const lakefront_north = R["lakefront_north"];
const lakefront_south = R["lakefront_south"];
const reception_area = R["reception_area"];
const health_club_front = R["health_club_front"];
const long_n_s_hallway = R["long_n_s_hallway"];
const fifth_oaktree_intersection = R["fifth_oaktree_intersection"];
const main_maple_intersection = R["main_maple_intersection"];
const museum_entrance = R["museum_entrance"];
const museum_lobby = R["museum_lobby"];
const maintenance_room = R["maintenance_room"];
const classroom = R["classroom"];
const endgame_computer_room = R["endgame_computer_room"];
const endgame_treasure_room = R["endgame_treasure_room"];
const winners_room = R["winners_room"];
const cave_entrance = R["cave_entrance"];
const misty_room = R["misty_room"];

/* ----------------------- UI plumbing ----------------------- */

let outEl: HTMLElement | null = null;
let inEl: HTMLInputElement | null = null;

function ensureUI() {
  if (!outEl) outEl = document.getElementById("dun-output");
  if (!inEl)
    inEl = document.getElementById("dun-input") as HTMLInputElement | null;
  if (!outEl || !inEl) {
    throw new Error(
      "UI elements with ids 'dun-output' and 'dun-input' are required.",
    );
  }
}

function scrollToBottom() {
  if (outEl) outEl.scrollTop = outEl.scrollHeight;
}

function dun_mprinc(s: any) {
  ensureUI();
  const text = typeof s === "string" ? s : String(s);
  outEl!.textContent += text;
  scrollToBottom();
}
function dun_mprincl(s: any) {
  dun_mprinc(s);
  dun_mprinc("\n");
}

/** NOTE: Browser adaptation — synchronous line input via window.prompt() where needed. */
function dun_read_line(promptText = ""): string {
  const ans = window.prompt(promptText) ?? "";
  // echo to transcript:
  if (promptText) dun_mprinc(ans);
  return ans;
}

/* ----------------------- Game state ----------------------- */

let dun_visited: number[] = [27];
let dun_current_room = 1;
let dun_exitf: boolean | null = null;
let dun_badcd: boolean | null = null;

let dun_computer = false;
let dun_floppy = false;
let dun_key_level = 0;
let dun_hole = false;
let dun_correct_answer: string[] | null = null;
let dun_lastdir = 0;
let dun_numsaves = 0;
let dun_jar: number[] | null = null;
let dun_dead = false;
let room = 0;
let dun_numcmds = 0;
let dun_wizard = false;
let dun_endgame_question: string | null = null;
let dun_logged_in = false as boolean;
let dungeon_mode: "dungeon" | "unix" | "dos" = "dungeon";
let dun_unix_verbs: Record<string, (args: string[]) => any> = {}; // assigned below
let dun_dos_verbs: Record<string, (args: string[]) => any> = {}; // assigned below
let dun_batch_mode = false;
let dun_cdpath = "/usr/toukmond";
let dun_cdroom = -10;
let dun_uncompressed = false;
let dun_ethernet = true;
let dun_restricted = new Set<string>([
  "dun_room_objects",
  "dungeon_map",
  "dun_rooms",
  "dun_room_silents",
  "dun_combination",
]);
let dun_ftptype: "ascii" | "binary" = "ascii";
let dun_endgame = false;
let dun_gottago = true;
let dun_black = false;
let dun_mode: "long" | "moby" | "dun-superb" = "moby"; // as in elisp
let line_list: string[] = [];
let dun_inbus = false;
let dun_nomail = false;
let dun_sauna_level = 0;
let dun_combination = ""; // set at init

/* -------------------- Direction constants ----------------- */
const north = 0,
  south = 1,
  east = 2,
  west = 3,
  northeast = 4,
  southeast = 5,
  northwest = 6,
  southwest = 7,
  up = 8,
  down = 9,
  _in = 10,
  _out = 11;

/* -------------------- Verb dispatch tables ---------------- */

const dun_ignore = new Set<string>(["the", "to", "at"]);

const dun_verblist: Record<string, (args: string[]) => any> = {
  // movement + aliases
  n: dun_n,
  s: dun_s,
  e: dun_e,
  w: dun_w,
  ne: dun_ne,
  se: dun_se,
  nw: dun_nw,
  sw: dun_sw,
  north: dun_n,
  south: dun_s,
  east: dun_e,
  west: dun_w,
  up: dun_up,
  u: dun_up,
  down: dun_down,
  d: dun_down,
  in: dun_in,
  out: dun_out,
  go: dun_go,
  board: dun_in,
  enter: dun_in,
  on: dun_in,
  off: dun_out,
  exit: dun_out,
  leave: dun_out,
  // inventory & actions
  i: dun_inven,
  inventory: dun_inven,
  look: dun_examine,
  x: dun_examine,
  l: dun_examine,
  examine: dun_examine,
  describe: dun_examine,
  read: dun_examine,
  take: dun_take,
  get: dun_take,
  drop: dun_drop,
  throw: dun_drop,
  dig: dun_dig,
  climb: dun_climb,
  eat: dun_eat,
  put: dun_put,
  insert: dun_put,
  shake: dun_shake,
  wave: dun_shake,
  turn: dun_turn,
  press: dun_press,
  push: dun_press,
  switch: dun_press,
  swim: dun_swim,
  break: dun_break,
  chop: dun_break,
  cut: dun_break,
  drive: dun_drive,
  // scoring/help
  score: dun_score,
  help: dun_help,
  long: dun_long,
  verbose: dun_long,
  urinate: dun_piss,
  piss: dun_piss,
  flush: dun_flush,
  sleep: dun_sleep,
  lie: dun_sleep,
  // computers
  type: dun_type,
  // reset: dun_power,
  // endgame
  superb: dun_superb,
  answer: dun_answer,
  // meta
  die: () => dun_die(""),
  quit: dun_quit,
  // save/restore
  save: dun_save_game,
  restore: dun_restore,
};

dun_unix_verbs = {
  ls: dun_ls,
  ftp: dun_ftp,
  echo: dun_echo,
  exit: dun_uexit,
  cd: dun_cd,
  pwd: dun_pwd,
  rlogin: dun_rlogin,
  ssh: dun_rlogin,
  uncompress: dun_uncompress,
  cat: dun_cat,
};

dun_dos_verbs = {
  dir: dun_dos_dir,
  type: dun_dos_type,
  exit: dun_dos_exit,
  command: dun_dos_spawn,
  "b:": dun_dos_invd,
  "c:": dun_dos_invd,
  "a:": dun_dos_nil,
};

/* ----------------- Parsing/helpers (Lisp-ish) --------------- */

function listify_string(str: string): string[] {
  // split on space or simple punctuation like elisp version
  const raw = (str + " ").split(/[ ,:;]+/).filter(Boolean);
  return raw.map((s) => s.toLowerCase());
}
function listify_string2(str: string): string[] {
  const raw = (str + " ").split(/ +/).filter(Boolean);
  return raw.map((s) => s.toLowerCase());
}
function dun_replace<T>(arr: T[], idx: number, value: T) {
  arr[idx] = value;
}

function dun_firstword(list: string[] | null): string | null {
  if (!list || !list.length) return null;
  let i = 0;
  while (i < list.length && dun_ignore.has(list[i]!.toLowerCase())) i++;
  return i < list.length ? list[i]! : null;
}
function dun_firstwordl(list: string[] | null): string[] | null {
  if (!list || !list.length) return null;
  let i = 0;
  while (i < list.length && dun_ignore.has(list[i]!.toLowerCase())) i++;
  return i < list.length ? list.slice(i) : null;
}

function dun_doverb(
  ignore: Set<string>,
  table: Record<string, (args: string[]) => any>,
  verb: string | undefined,
  rest: string[] | undefined,
) {
  if (!verb) return;
  if (ignore.has(verb)) {
    if (rest && rest.length)
      return dun_doverb(ignore, table, rest[0], rest.slice(1));
    return -1;
  }
  const fn = table[verb];
  if (!fn) return -1;
  dun_numcmds++;
  return fn(rest ?? []);
}

function dun_vparse(
  _ignore: Set<string>,
  _verblist: Record<string, (args: string[]) => any>,
  line: string,
) {
  dun_mprinc("\n");
  line_list = listify_string(line);
  return dun_doverb(dun_ignore, dun_verblist, line_list[0], line_list.slice(1));
}
function dun_parse2(
  _ignore: Set<string> | null,
  verbs: Record<string, (args: string[]) => any>,
  line: string,
) {
  // used by unix/dos
  line_list = listify_string2(line);
  return dun_doverb(new Set(), verbs, line_list[0], line_list.slice(1));
}

function objnum_from_args(args: string[] | null): number | null {
  const w = dun_firstword(args ?? []);
  if (!w) return obj_special;
  return dun_objnames.get(w) ?? null;
}
function objnum_from_args_std(args: string[] | null): number | null {
  const r = objnum_from_args(args);
  if (r === obj_special) {
    dun_mprincl("You must supply an object.");
    return null;
  }
  if (r == null) {
    dun_mprincl("I don't know what that is.");
    return null;
  }
  return r;
}
function members(s: string, list: string[]): boolean {
  return list.some((x) => x === s);
}

/* -------------------- Core UI loop ------------------------ */

function dun_fix_screen() {
  scrollToBottom();
}

function dun_messages() {
  if (dun_dead) return;
  if (dungeon_mode === "dungeon") {
    if (room !== dun_current_room) {
      dun_describe_room(dun_current_room);
      room = dun_current_room;
    }
    dun_fix_screen();
    dun_mprinc(">");
  } else if (dungeon_mode === "unix") {
    dun_fix_screen();
    dun_mprinc("$ ");
  } else if (dungeon_mode === "dos") {
    dun_fix_screen();
    dun_dos_prompt();
  }
}

export function initDunnet() {
  ensureUI();
  inEl!.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      const line = inEl!.value.trim();
      inEl!.value = "";
      if (!line) {
        dun_mprinc("\n>");
        return;
      }
      // echo user input like a terminal
      if (dungeon_mode === "dungeon") {
        dun_mprinc(line);
        const r = dun_vparse(dun_ignore, dun_verblist, line);
        if (r === -1) dun_mprincl("I don't understand that.");
        dun_mprinc("\n");
        dun_messages();
      } else if (dungeon_mode === "unix") {
        dun_mprinc(line + "\n");
        const r = dun_parse2(null, dun_unix_verbs, line);
        if (r === -1) dun_mprincl(`${line_list[0]}: not found.`);
        dun_messages();
      } else if (dungeon_mode === "dos") {
        dun_mprinc(line + "\n");
        const r = dun_parse2(null, dun_dos_verbs, line);
        if (r === -1) dun_mprincl("Bad command or file name");
        dun_messages();
      }
    }
  });
  // start game
  dunnet();
}

export function dunnet() {
  dun_dead = false;
  room = 0;
  // randomized elements
  {
    // place EGG at random tloc (TS port of elisp end)
    const tloc = 60 + Math.floor(Math.random() * 18);
    dun_room_objects[tloc] = [...(dun_room_objects[tloc] ?? []), obj_egg];
    const tcomb = 100 + Math.floor(Math.random() * 899);
    dun_combination = String(tcomb);
  }
  // initial inventory: lamp (as in elisp)
  dun_inventory = [obj_lamp];
  // UI
  dun_mprinc(""); // initial newline behavior
  dun_messages();
}

/* -------------------- Room & descriptions ------------------ */

function dun_describe_room(r: number) {
  // darkness check
  if (
    !dun_light_rooms.includes(Math.abs(r)) &&
    !dun_inventory.includes(obj_lamp) &&
    !(dun_room_objects[dun_current_room] ?? []).includes(obj_lamp)
  ) {
    dun_mprincl("It is pitch dark.  You are likely to be eaten by a grue.");
    return;
  }

  dun_mprincl(dun_rooms[Math.abs(r)][1]); // short title line
  const needLong =
    !(
      (dun_visited.includes(Math.abs(r)) || dun_mode === "dun-superb") &&
      r > 0
    ) || dun_mode === "long";
  if (needLong) {
    dun_mprinc(dun_rooms[Math.abs(r)][0]);
    dun_mprinc("\n");
  }
  if (dun_mode !== "long") {
    if (!dun_visited.includes(Math.abs(r)))
      dun_visited = [Math.abs(r), ...dun_visited];
  }
  // objects in room
  for (const x of dun_room_objects[dun_current_room] ?? []) {
    if (x === obj_special) {
      dun_special_object();
    } else if (x >= 0) {
      dun_mprincl(dun_objects[x][0]);
    } else {
      if (!(x === obj_bus && dun_inbus)) {
        dun_mprincl(dun_perm_objects[Math.abs(x)] ?? "");
      }
    }
    if (x === obj_jar && dun_jar && dun_jar.length) {
      dun_mprincl("The jar contains:");
      for (const j of dun_jar) {
        dun_mprinc("     ");
        dun_mprincl(dun_objects[j][0]);
      }
    }
  }
  if (
    (dun_room_objects[dun_current_room] ?? []).includes(obj_bus) &&
    dun_inbus
  ) {
    dun_mprincl("You are on the bus.");
  }
}

function dun_special_object() {
  if (dun_current_room === computer_room) {
    if (dun_computer) {
      dun_mprincl(
        "The panel lights are flashing in a seemingly organized pattern.",
      );
    } else {
      dun_mprincl("The panel lights are steady and motionless.");
    }
  }
  if (
    dun_current_room === red_room &&
    !(dun_room_objects[red_room] ?? []).includes(obj_towel)
  ) {
    dun_mprincl("There is a hole in the floor here.");
  }
  if (dun_current_room === marine_life_area && dun_black) {
    dun_mprincl(
      "The room is lit by a black light, causing the fish, and some of\nyour objects, to give off an eerie glow.",
    );
  }
  if (dun_current_room === fourth_vermont_intersection && dun_hole) {
    if (!dun_inbus) {
      dun_mprincl("You fall into a hole in the ground.");
      dun_current_room = vermont_station;
      dun_describe_room(vermont_station);
    } else {
      dun_mprincl("The bus falls down a hole in the ground and explodes.");
      dun_die("burning");
    }
  }
  if (dun_current_room > endgame_computer_room) {
    if (!dun_correct_answer) {
      dun_endgame_question_fn();
    } else {
      dun_mprincl("Your question is:");
      dun_mprincl(dun_endgame_question ?? "");
    }
  }
  if (dun_current_room === R["sauna"]) {
    dun_mprincl(
      [
        "It is normal room temperature in here.",
        "It is luke warm in here.",
        "It is comfortably hot in here.",
        "It is refreshingly hot in here.",
        "You are dead now.",
      ][dun_sauna_level] ?? "",
    );
    if (dun_sauna_level === 3) {
      // melt RMS -> diamond
      if (
        dun_inventory.includes(obj_rms) ||
        (dun_room_objects[dun_current_room] ?? []).includes(obj_rms)
      ) {
        dun_mprincl(
          "You notice the wax on your statuette beginning to melt, until it completely\nmelts off.  You are left with a beautiful diamond!",
        );
        if (dun_inventory.includes(obj_rms)) {
          dun_remove_obj_from_inven(obj_rms);
          dun_inventory.push(obj_diamond);
        } else {
          dun_remove_obj_from_room(dun_current_room, obj_rms);
          dun_room_objects[dun_current_room] = [
            ...(dun_room_objects[dun_current_room] ?? []),
            obj_diamond,
          ];
        }
      }
      // melt floppy
      if (
        dun_inventory.includes(obj_floppy) ||
        (dun_room_objects[dun_current_room] ?? []).includes(obj_floppy)
      ) {
        dun_mprincl(
          "You notice your floppy disk beginning to melt.  As you grab for it, the\ndisk bursts into flames, and disintegrates.",
        );
        if (dun_inventory.includes(obj_floppy))
          dun_remove_obj_from_inven(obj_floppy);
        dun_remove_obj_from_room(dun_current_room, obj_floppy);
      }
    }
  }
}

/* ----------------- Death / quit / inventory ---------------- */

function dun_die(murderer?: string | null) {
  dun_mprinc("\n");
  if (murderer) dun_mprincl("You are dead.");
  dun_do_logfile("dun-die", murderer ?? "");
  dun_score(null);
  dun_dead = true;
}

function dun_quit(_args?: string[]) {
  dun_die(null);
}

function dun_inven(_args?: string[]) {
  dun_mprinc("You currently have:\n");
  for (const curobj of dun_inventory) {
    if (curobj != null) {
      dun_mprincl(dun_objects[curobj][1]);
      if (curobj === obj_jar && dun_jar && dun_jar.length) {
        dun_mprincl("The jar contains:");
        for (const j of dun_jar) {
          dun_mprinc("     ");
          dun_mprincl(dun_objects[j][1]);
        }
      }
    }
  }
}

/* ----------------- Actions: shake / drop / examine ---------- */

function dun_shake(obj: string[] | null) {
  const objnum = objnum_from_args_std(obj);
  if (objnum == null) return;

  if (dun_inventory.includes(objnum)) {
    dun_mprinc(
      "Shaking " +
        dun_objects[objnum][1].toLowerCase() +
        " seems to have no effect.\n",
    );
    return;
  }
  const here =
    (dun_room_objects[dun_current_room] ?? []).includes(objnum) ||
    (dun_room_silents[dun_current_room] ?? []).includes(objnum);
  if (!here) {
    dun_mprincl("I don't see that here.");
    return;
  }

  if (objnum === obj_tree) {
    dun_mprinc(
      "You begin to shake a tree, and notice a coconut begin to fall from the air.\nAs you try to get your hand up to block it, you feel the impact as it lands\non your head.",
    );
    dun_die("a coconut");
  } else if (objnum === obj_bear) {
    dun_mprinc(
      "As you go up to the bear, it removes your head and places it on the ground.",
    );
    dun_die("a bear");
  } else if (objnum < 0) {
    dun_mprincl("You cannot shake that.");
  } else {
    dun_mprincl("You don't have that.");
  }
}

function dun_drop(obj: string[] | null) {
  if (dun_inbus) {
    dun_mprincl("You can't drop anything while on the bus.");
    return;
  }
  const objnum = objnum_from_args_std(obj);
  if (objnum == null) return;
  if (!dun_inventory.includes(objnum)) {
    dun_mprincl("You don't have that.");
    return;
  }

  dun_remove_obj_from_inven(objnum);
  dun_room_objects[dun_current_room] = [
    ...(dun_room_objects[dun_current_room] ?? []),
    objnum,
  ];
  dun_mprincl("Done.");
  if ([obj_food, obj_weight, obj_jar].includes(objnum)) dun_drop_check(objnum);
}

function dun_drop_check(objnum: number) {
  if (
    objnum === obj_food &&
    dun_current_room === bear_hangout &&
    (dun_room_objects[bear_hangout] ?? []).includes(obj_bear)
  ) {
    dun_mprincl(
      "The bear takes the food and runs away with it. He left something behind.",
    );
    dun_remove_obj_from_room(dun_current_room, obj_bear);
    dun_remove_obj_from_room(dun_current_room, obj_food);
    dun_room_objects[dun_current_room] = [
      ...(dun_room_objects[dun_current_room] ?? []),
      obj_key,
    ];
  }
  if (
    objnum === obj_jar &&
    dun_jar &&
    dun_jar.includes(obj_nitric) &&
    dun_jar.includes(obj_glycerine)
  ) {
    dun_mprincl("As the jar impacts the ground it explodes into many pieces.");
    dun_jar = null;
    dun_remove_obj_from_room(dun_current_room, obj_jar);
    if (dun_current_room === fourth_vermont_intersection) {
      dun_hole = true;
      dun_current_room = vermont_station;
      dun_mprincl(
        "The explosion causes a hole to open up in the ground, which you fall\nthrough.",
      );
    }
  }
  if (objnum === obj_weight && dun_current_room === maze_button_room) {
    dun_mprincl("A passageway opens.");
  }
}

function dun_examine(obj: string[] | null) {
  const objnum = objnum_from_args(obj);
  if (objnum === obj_special) {
    // look / x (no object) → room long description
    dun_describe_room(-dun_current_room);
    return;
  }
  if (
    objnum === obj_computer &&
    (dun_room_silents[dun_current_room] ?? []).includes(obj_pc)
  ) {
    return dun_examine(["pc"]);
  }
  if (objnum == null) {
    dun_mprincl("I don't know what that is.");
    return;
  }

  // presence check
  const here =
    (dun_room_objects[dun_current_room] ?? []).includes(objnum) ||
    (dun_room_silents[dun_current_room] ?? []).includes(objnum) ||
    dun_inventory.includes(objnum) ||
    (dun_jar?.includes(objnum) && dun_inventory.includes(obj_jar));

  if (!here) {
    dun_mprincl("I don't see that here.");
    return;
  }

  if (objnum >= 0) {
    if (
      objnum === obj_bone &&
      dun_current_room === marine_life_area &&
      dun_black
    ) {
      dun_mprincl(
        "In this light you can see some writing on the bone.  It says:\nFor an explosive time, go to Fourth St. and Vermont.",
      );
      return;
    }
    if (dun_physobj_desc[objnum]) dun_mprincl(dun_physobj_desc[objnum]!);
    else dun_mprincl("I see nothing special about that.");
  } else {
    const d = dun_permobj_desc[Math.abs(objnum)];
    if (d) dun_mprincl(d);
    else dun_mprincl("I see nothing special about that.");
  }
}

/* ----------------- Actions: take / dig / climb / eat -------- */

function dun_take(args: string[] | null) {
  const fw = dun_firstword(args ?? []);
  if (!fw) {
    dun_mprincl("You must supply an object.");
    return;
  }
  if (fw === "all") {
    if (dun_inbus) {
      dun_mprincl("You can't take anything while on the bus.");
      return;
    }
    let gotsome = false;
    for (const x of dun_room_objects[dun_current_room] ?? []) {
      if (x >= 0 && x !== obj_special) {
        gotsome = true;
        dun_mprinc(dun_objects[x][1] + ": ");
        dun_take_object(x);
      }
    }
    if (!gotsome) dun_mprincl("Nothing to take.");
    return;
  }
  const objnum = dun_objnames.get(fw);
  if (objnum == null) {
    dun_mprinc("I don't know what that is.\n");
    return;
  }
  if (
    dun_inbus &&
    !(dun_inventory.includes(obj_jar) && dun_jar?.includes(objnum))
  ) {
    dun_mprincl("You can't take anything while on the bus.");
    return;
  }
  dun_take_object(objnum);
}

function dun_take_object(objnum: number) {
  if (dun_jar?.includes(objnum) && dun_inventory.includes(obj_jar)) {
    // remove from jar to inventory
    dun_mprincl("You remove it from the jar.");
    dun_jar = dun_jar.filter((x) => x !== objnum);
    dun_inventory.push(objnum);
    dun_mprinc("\n");
    return;
  }
  if (!(dun_room_objects[dun_current_room] ?? []).includes(objnum)) {
    if (!(dun_room_silents[dun_current_room] ?? []).includes(objnum)) {
      dun_mprinc("I do not see that here.\n");
      return;
    }
    // trying to take untakeable
    return dun_try_take(objnum);
  }
  if (objnum >= 0) {
    const load = dun_inven_weight() + dun_object_lbs[objnum];
    if (dun_inventory.length > 0 && load > 11) {
      dun_mprinc("Your load would be too heavy.");
    } else {
      dun_inventory.push(objnum);
      dun_remove_obj_from_room(dun_current_room, objnum);
      dun_mprinc("Taken.  ");
      if (objnum === obj_towel && dun_current_room === red_room) {
        dun_mprinc("Taking the towel reveals a hole in the floor.");
      }
    }
  } else {
    dun_try_take(objnum);
  }
  dun_mprinc("\n");
}

function dun_inven_weight(): number {
  let total = 0;
  for (const x of dun_jar ?? []) total += dun_object_lbs[x];
  for (const x of dun_inventory) total += dun_object_lbs[x];
  return total;
}

function dun_try_take(_obj: number) {
  dun_mprinc("You cannot take that.");
}

function dun_dig(_args?: string[]) {
  if (dun_inbus) {
    dun_mprincl("Digging here reveals nothing.");
    return;
  }
  if (!dun_inventory.includes(obj_shovel)) {
    dun_mprincl("You have nothing with which to dig.");
    return;
  }
  const dig = dun_diggables[dun_current_room];
  if (!dig) {
    dun_mprincl("Digging here reveals nothing.");
    return;
  }
  dun_mprincl("I think you found something.");
  dun_room_objects[dun_current_room] = [
    ...(dun_room_objects[dun_current_room] ?? []),
    ...dig,
  ];
  dun_diggables[dun_current_room] = null;
}

function dun_climb(obj: string[] | null) {
  const objnum = objnum_from_args(obj);
  if (!objnum) {
    dun_mprincl("I don't know what that object is.");
    return;
  }
  const here =
    objnum === obj_special
      ? (dun_room_silents[dun_current_room] ?? []).includes(obj_tree)
      : (dun_room_objects[dun_current_room] ?? []).includes(objnum) ||
        (dun_room_silents[dun_current_room] ?? []).includes(objnum) ||
        dun_inventory.includes(objnum) ||
        (dun_jar?.includes(objnum) && dun_inventory.includes(obj_jar));

  if (!here) {
    dun_mprincl("I don't see that here.");
    return;
  }
  if (
    objnum === obj_special &&
    !(dun_room_silents[dun_current_room] ?? []).includes(obj_tree)
  ) {
    dun_mprincl("There is nothing here to climb.");
    return;
  }
  if (objnum !== obj_tree && objnum !== obj_special) {
    dun_mprincl("You can't climb that.");
    return;
  }
  dun_mprincl(
    "You manage to get about two feet up the tree and fall back down.  You\nnotice that the tree is very unsteady.",
  );
}

function dun_eat(obj: string[] | null) {
  const objnum = objnum_from_args_std(obj);
  if (objnum == null) return;
  if (!dun_inventory.includes(objnum)) {
    dun_mprincl("You don't have that.");
    return;
  }
  if (objnum !== obj_food) {
    dun_mprinc(
      "You forcefully shove " +
        dun_objects[objnum][1].toLowerCase() +
        " down your throat, and start choking.\n",
    );
    dun_die("choking");
    return;
  }
  dun_mprincl("That tasted horrible.");
  dun_remove_obj_from_inven(obj_food);
}

/* ----------------- Actions: put / type (unix) --------------- */

function dun_put(args: string[] | null) {
  let newargs = dun_firstwordl(args ?? []);
  if (!newargs) {
    dun_mprincl("You must supply an object");
    return;
  }
  const obj = dun_objnames.get(newargs[0]!);
  if (obj == null) {
    dun_mprincl("I don't know what that object is.");
    return;
  }
  if (!dun_inventory.includes(obj)) {
    dun_mprincl("You don't have that.");
    return;
  }

  newargs = dun_firstwordl(newargs.slice(1));
  newargs = dun_firstwordl(newargs?.slice(1) ?? null);
  if (!newargs) {
    dun_mprincl("You must supply an indirect object.");
    return;
  }
  let obj2 = dun_objnames.get(newargs[0]!);
  if (obj2 === obj_computer && dun_current_room === pc_area) obj2 = obj_pc;
  if (obj2 == null) {
    dun_mprincl("I don't know what that indirect object is.");
    return;
  }

  const here =
    (dun_room_objects[dun_current_room] ?? []).includes(obj2) ||
    (dun_room_silents[dun_current_room] ?? []).includes(obj2) ||
    dun_inventory.includes(obj2);
  if (!here) {
    dun_mprincl("That indirect object is not here.");
    return;
  }

  dun_put_objs(obj, obj2);
}

function dun_put_objs(obj1: number, obj2: number) {
  if (obj2 === dun_objnames.get("drop") && !dun_nomail) obj2 = obj_chute;
  if (obj2 === obj_disposal) obj2 = obj_chute;

  if (
    obj1 === obj_cpu &&
    obj2 === obj_computer &&
    dun_current_room === computer_room
  ) {
    dun_remove_obj_from_inven(obj_cpu);
    dun_computer = true;
    dun_mprincl(
      "As you put the CPU board in the computer, it immediately springs to life.\nThe lights start flashing, and the fans seem to startup.",
    );
    return;
  }

  if (obj1 === obj_weight && obj2 === obj_button) {
    dun_drop(["weight"]);
    return;
  }

  if (obj2 === obj_jar) {
    if (
      ![
        obj_paper,
        obj_diamond,
        obj_emerald(),
        obj_license,
        obj_coins,
        obj_egg,
        obj_nitric,
        obj_glycerine,
      ].includes(obj1)
    ) {
      dun_mprincl("That will not fit in the jar.");
      return;
    }
    dun_remove_obj_from_inven(obj1);
    dun_jar = [...(dun_jar ?? []), obj1];
    dun_mprincl("Done.");
    return;
  }

  if (obj2 === obj_chute) {
    dun_remove_obj_from_inven(obj1);
    dun_mprincl("You hear it slide down the chute and off into the distance.");
    dun_put_objs_in_treas([obj1]);
    return;
  }

  if (obj2 === obj_box) {
    if (obj1 === obj_key) {
      dun_mprincl(
        "As you drop the key, the box begins to shake.  Finally it explodes\nwith a bang.  The key seems to have vanished!",
      );
      dun_remove_obj_from_inven(obj1);
      dun_room_objects[computer_room] = [
        ...(dun_room_objects[computer_room] ?? []),
        obj1,
      ];
      dun_remove_obj_from_room(dun_current_room, obj_box);
      dun_key_level += 1;
    } else {
      dun_mprincl("You can't put that in the key box!");
    }
    return;
  }

  if (obj1 === obj_floppy && obj2 === obj_pc) {
    dun_floppy = true;
    dun_remove_obj_from_inven(obj1);
    dun_mprincl("Done.");
    return;
  }

  if (obj2 === obj_urinal) {
    dun_remove_obj_from_inven(obj1);
    dun_room_objects[R["urinal"]] = [
      ...(dun_room_objects[R["urinal"]] ?? []),
      obj1,
    ];
    dun_mprincl("You hear it plop down in some water below.");
    return;
  }

  if (obj2 === obj_mail) {
    dun_mprincl("The mail chute is locked.");
    return;
  }

  if (dun_inventory.includes(obj1)) {
    dun_mprincl(
      "I don't know how to combine those objects.  Perhaps you should\njust try dropping it.",
    );
  } else {
    dun_mprincl("You can't put that there.");
  }
}

function obj_emerald() {
  return obj_bracelet;
} // original naming: 'emerald bracelet' id used as treasure

function dun_type(_args?: string[]) {
  if (dun_current_room !== computer_room) {
    dun_mprincl("There is nothing here on which you could type.");
    return;
  }
  if (!dun_computer) {
    dun_mprincl(
      "You type on the keyboard, but your characters do not even echo.",
    );
    return;
  }
  dun_unix_interface();
}

/* ------------------------ Movement ------------------------- */

function dun_n() {
  dun_move(north);
}
function dun_s() {
  dun_move(south);
}
function dun_e() {
  dun_move(east);
}
function dun_w() {
  dun_move(west);
}
function dun_ne() {
  dun_move(northeast);
}
function dun_se() {
  dun_move(southeast);
}
function dun_nw() {
  dun_move(northwest);
}
function dun_sw() {
  dun_move(southwest);
}
function dun_up() {
  dun_move(up);
}
function dun_down() {
  dun_move(down);
}
function dun_in() {
  dun_move(_in);
}
function dun_out() {
  dun_move(_out);
}

function dun_go(args?: string[]) {
  if (
    !args ||
    !args[0] ||
    dun_doverb(dun_ignore, dun_verblist, args[0], args.slice(1)) === -1
  ) {
    dun_mprinc("I don't understand where you want me to go.\n");
  }
}

function dun_move(dir: number) {
  if (
    !dun_light_rooms.includes(dun_current_room) &&
    !dun_inventory.includes(obj_lamp) &&
    !(dun_room_objects[dun_current_room] ?? []).includes(obj_lamp)
  ) {
    dun_mprinc(
      "You trip over a grue and fall into a pit and break every bone in your\nbody.",
    );
    dun_die("a grue");
    return;
  }
  const newroom = dungeon_map[dun_current_room][dir];
  if (newroom === -1) {
    dun_mprinc("You can't go that way.\n");
    return;
  }
  if (newroom === 255) {
    dun_special_move(dir);
    return;
  }

  room = -1;
  dun_lastdir = dir;

  if (dun_inbus) {
    if (newroom < 58 || newroom > 83) {
      dun_mprincl("The bus cannot go this way.");
      return;
    }
    dun_mprincl("The bus lurches ahead and comes to a screeching halt.");
    dun_remove_obj_from_room(dun_current_room, obj_bus);
    dun_current_room = newroom;
    dun_room_objects[newroom] = [...(dun_room_objects[newroom] ?? []), obj_bus];
  } else {
    dun_current_room = newroom;
  }
}

/* ---------- Movement specials (ported as-is, with comments) --------- */

function dun_special_move(dir: number) {
  if (dun_current_room === building_front) {
    if (!dun_inventory.includes(obj_key))
      dun_mprincl("You don't have a key that can open this door.");
    else dun_current_room = old_building_hallway;
  }

  if (dun_current_room === north_end_of_cave_passage) {
    dun_mprincl("You must type a 3 digit combination code to enter this room.");
    const combo = dun_read_line("Enter it here: ");
    dun_mprinc("\n");
    if (combo === dun_combination) dun_current_room = gamma_computing_center;
    else dun_mprincl("Sorry, that combination is incorrect.");
  }

  if (dun_current_room === bear_hangout) {
    if ((dun_room_objects[bear_hangout] ?? []).includes(obj_bear)) {
      dun_mprinc(
        "The bear is very annoyed that you would be so presumptuous as to try\nand walk right by it.  He tells you so by tearing your head off.\n",
      );
      dun_die("a bear");
    } else {
      dun_mprincl("You can't go that way.");
    }
  }

  if (dun_current_room === vermont_station) {
    dun_mprincl(
      "As you board the train it immediately leaves the station.  It is a very\nbumpy ride.  It is shaking from side to side, and up and down.  You\nsit down in one of the chairs in order to be more comfortable.",
    );
    dun_mprincl(
      "\nFinally the train comes to a sudden stop, and the doors open, and some\nforce throws you out.  The train speeds away.\n",
    );
    dun_current_room = museum_station;
  }

  if (dun_current_room === old_building_hallway) {
    if (dun_inventory.includes(obj_key) && dun_key_level > 0)
      dun_current_room = meadow;
    else dun_mprincl("You don't have a key that can open this door.");
  }

  if (dun_current_room === maze_button_room && dir === northwest) {
    if ((dun_room_objects[maze_button_room] ?? []).includes(obj_weight))
      dun_current_room = 18;
    else dun_mprincl("You can't go that way.");
  }
  if (dun_current_room === maze_button_room && dir === up) {
    if ((dun_room_objects[maze_button_room] ?? []).includes(obj_weight))
      dun_mprincl("You can't go that way.");
    else dun_current_room = weight_room;
  }

  if (dun_current_room === classroom) {
    dun_mprincl("The door is locked.");
  }

  if (
    dun_current_room === lakefront_north ||
    dun_current_room === lakefront_south
  ) {
    dun_swim(null);
  }

  if (dun_current_room === reception_area) {
    if (dun_sauna_level !== 3) {
      dun_current_room = health_club_front;
    } else {
      dun_mprincl(
        "As you exit the building, you notice some flames coming out of one of the\nwindows.  Suddenly, the building explodes in a huge ball of fire.  The flames\nengulf you, and you burn to death.",
      );
      dun_die("burning");
    }
  }

  if (dun_current_room === red_room) {
    if (!(dun_room_objects[red_room] ?? []).includes(obj_towel))
      dun_current_room = long_n_s_hallway;
    else dun_mprincl("You can't go that way.");
  }

  if (
    dir > down &&
    dun_current_room > gamma_computing_center &&
    dun_current_room < museum_lobby
  ) {
    if (!(dun_room_objects[dun_current_room] ?? []).includes(obj_bus)) {
      dun_mprincl("You can't go that way.");
    } else {
      if (dir === _in) {
        if (dun_inbus) {
          dun_mprincl("You are already in the bus!");
        } else if (dun_inventory.includes(obj_license)) {
          dun_mprincl("You board the bus and get in the driver's seat.");
          dun_nomail = true;
          dun_inbus = true;
        } else dun_mprincl("You are not licensed for this type of vehicle.");
      } else {
        if (!dun_inbus) dun_mprincl("You are already off the bus!");
        else {
          dun_mprincl("You hop off the bus.");
          dun_inbus = false;
        }
      }
    }
  } else {
    if (dun_current_room === fifth_oaktree_intersection) {
      if (!dun_inbus) {
        dun_mprincl("You fall down the cliff and land on your head.");
        dun_die("a cliff");
      } else {
        dun_mprincl(
          "The bus flies off the cliff, and plunges to the bottom, where it explodes.",
        );
        dun_die("a bus accident");
      }
    }
    if (dun_current_room === main_maple_intersection) {
      if (!dun_inbus) dun_mprincl("The gate will not open.");
      else {
        dun_mprincl(
          "As the bus approaches, the gate opens and you drive through.",
        );
        dun_remove_obj_from_room(main_maple_intersection, obj_bus);
        dun_room_objects[museum_entrance] = [
          ...(dun_room_objects[museum_entrance] ?? []),
          obj_bus,
        ];
        dun_current_room = museum_entrance;
      }
    }
  }

  if (dun_current_room === cave_entrance) {
    dun_mprincl(
      "As you enter the room you hear a rumbling noise.  You look back to see\nhuge rocks sliding down from the ceiling, and blocking your way out.\n",
    );
    dun_current_room = misty_room;
  }
}

/* ---------------------- Misc actions ----------------------- */

function dun_long() {
  dun_mode = "long";
}

function dun_turn(obj: string[] | null) {
  const objnum = objnum_from_args_std(obj);
  if (objnum == null) return;
  const here =
    (dun_room_objects[dun_current_room] ?? []).includes(objnum) ||
    (dun_room_silents[dun_current_room] ?? []).includes(objnum);
  if (!here) {
    dun_mprincl("I don't see that here.");
    return;
  }
  if (objnum !== obj_dial) {
    dun_mprincl("You can't turn that.");
    return;
  }
  const direction = dun_firstword((obj ?? []).slice(1));
  if (
    !direction ||
    (direction !== "clockwise" && direction !== "counterclockwise")
  ) {
    dun_mprincl("You must indicate clockwise or counterclockwise.");
    return;
  }
  if (direction === "clockwise") dun_sauna_level += 1;
  else dun_sauna_level -= 1;
  if (dun_sauna_level < 0) {
    dun_mprincl("The dial will not turn further in that direction.");
    dun_sauna_level = 0;
  } else dun_sauna_heat();
}

function dun_sauna_heat() {
  if (dun_sauna_level === 0)
    dun_mprincl("The temperature has returned to normal room temperature.");
  if (dun_sauna_level === 1)
    dun_mprincl("It is now luke warm in here.  You are perspiring.");
  if (dun_sauna_level === 2)
    dun_mprincl("It is pretty hot in here.  It is still very comfortable.");
  if (dun_sauna_level === 3) {
    dun_mprincl(
      "It is now very hot.  There is something very refreshing about this.",
    );
    if (
      dun_inventory.includes(obj_rms) ||
      (dun_room_objects[dun_current_room] ?? []).includes(obj_rms)
    ) {
      dun_mprincl(
        "You notice the wax on your statuette beginning to melt, until it completely\nmelts off.  You are left with a beautiful diamond!",
      );
      if (dun_inventory.includes(obj_rms)) {
        dun_remove_obj_from_inven(obj_rms);
        dun_inventory.push(obj_diamond);
      } else {
        dun_remove_obj_from_room(dun_current_room, obj_rms);
        dun_room_objects[dun_current_room] = [
          ...(dun_room_objects[dun_current_room] ?? []),
          obj_diamond,
        ];
      }
    }
    if (
      dun_inventory.includes(obj_floppy) ||
      (dun_room_objects[dun_current_room] ?? []).includes(obj_floppy)
    ) {
      dun_mprincl(
        "You notice your floppy disk beginning to melt.  As you grab for it, the\ndisk bursts into flames, and disintegrates.",
      );
      if (dun_inventory.includes(obj_floppy))
        dun_remove_obj_from_inven(obj_floppy);
      else dun_remove_obj_from_room(dun_current_room, obj_floppy);
    }
  }
  if (dun_sauna_level === 4) {
    dun_mprincl(
      "As the dial clicks into place, you immediately burst into flames.",
    );
    dun_die("burning");
  }
}

function dun_press(obj: string[] | null) {
  const objnum = objnum_from_args_std(obj);
  if (objnum == null) return;
  const here =
    (dun_room_objects[dun_current_room] ?? []).includes(objnum) ||
    (dun_room_silents[dun_current_room] ?? []).includes(objnum);
  if (!here) {
    dun_mprincl("I don't see that here.");
    return;
  }
  if (![obj_button, obj_switch].includes(objnum)) {
    dun_mprinc(`You can't ${line_list[0]} that.\n`);
    return;
  }
  if (objnum === obj_button) {
    dun_mprincl(
      "As you press the button, you notice a passageway open up, but\nas you release it, the passageway closes.",
    );
  }
  if (objnum === obj_switch) {
    if (dun_black) {
      dun_mprincl("The button is now in the off position.");
      dun_black = false;
    } else {
      dun_mprincl("The button is now in the on position.");
      dun_black = true;
    }
  }
}

function dun_swim(_args?: string[] | null) {
  if (![lakefront_north, lakefront_south].includes(dun_current_room)) {
    dun_mprincl("I see no water!");
    return;
  }
  if (!dun_inventory.includes(obj_life)) {
    dun_mprincl(
      "You dive in the water, and at first notice it is quite cold.  You then\nstart to get used to it as you realize that you never really learned how\nto swim.",
    );
    dun_die("drowning");
    return;
  }
  dun_current_room =
    dun_current_room === lakefront_north ? lakefront_south : lakefront_north;
}

function dun_score(_args: any) {
  if (!dun_endgame) {
    const total = dun_reg_score();
    dun_mprinc("You have scored ");
    dun_mprinc(total);
    dun_mprincl(" out of a possible 90 points.");
    return total;
  } else {
    const total = dun_endgame_score();
    dun_mprinc("You have scored ");
    dun_mprinc(total);
    dun_mprincl(" endgame points out of a possible 110.");
    if (total === 110) {
      dun_mprincl(
        "\n\nCongratulations.  You have won.  The wizard password is ‘moby’",
      );
    }
    return total;
  }
}

function dun_help() {
  dun_mprincl(
    `Welcome to dunnet (2.02), by Ron Schnell (ronnie@driver-aces.com - @RonnieSchnell).
Here is some useful information (read carefully because there are one
or more clues in here):
- If you have a key that can open a door, you do not need to explicitly
  open it.  You may just use ‘in’ or walk in the direction of the door.

- If you have a lamp, it is always lit.

- You will not get any points until you manage to get treasures to a certain
  place.  Simply finding the treasures is not good enough.  There is more
  than one way to get a treasure to the special place.  It is also
  important that the objects get to the special place *unharmed* and
  *untarnished*.  You can tell if you have successfully transported the
  object by looking at your score, as it changes immediately.  Note that
  an object can become harmed even after you have received points for it.
  If this happens, your score will decrease, and in many cases you can never
  get credit for it again.

- You can save your game with the ‘save’ command, and use restore it
  with the ‘restore’ command.

- There are no limits on lengths of object names.

- Directions are: north,south,east,west,northeast,southeast,northwest,
                  southwest,up,down,in,out.

- These can be abbreviated: n,s,e,w,ne,se,nw,sw,u,d,in,out.

- If you go down a hole in the floor without an aid such as a ladder,
  you probably won't be able to get back up the way you came, if at all.

- To run this game in batch mode (no Emacs window), use:
     emacs -batch -l dunnet
NOTE: This game *should* be run in batch mode!

If you have questions or comments, please contact ronnie@driver-aces.com
My home page is http://www.driver-aces.com/ronnie.html`,
  );
}

function dun_flush() {
  if (dun_current_room !== R["bathroom"]) {
    dun_mprincl("I see nothing to flush.");
    return;
  }
  dun_mprincl("Whoooosh!!");
  dun_put_objs_in_treas(dun_room_objects[R["urinal"]] ?? []);
  dun_room_objects[R["urinal"]] = [];
}

function dun_piss() {
  if (dun_current_room !== R["bathroom"]) {
    dun_mprincl("You can't do that here, don't even bother trying.");
    return;
  }
  if (!dun_gottago) {
    dun_mprincl("I'm afraid you don't have to go now.");
    return;
  }
  dun_mprincl("That was refreshing.");
  dun_gottago = false;
  dun_room_objects[R["urinal"]] = [
    ...(dun_room_objects[R["urinal"]] ?? []),
    obj_URINE,
  ];
}

function dun_sleep() {
  if (dun_current_room !== R["bedroom"]) {
    dun_mprincl(
      "You try to go to sleep while standing up here, but can't seem to do it.",
    );
    return;
  }
  dun_gottago = true;
  dun_mprincl(`As soon as you start to doze off you begin dreaming.  You see images of
workers digging caves, slaving in the humid heat.  Then you see yourself
as one of these workers.  While no one is looking, you leave the group
and walk into a room.  The room is bare except for a horseshoe
shaped piece of stone in the center.  You see yourself digging a hole in
the ground, then putting some kind of treasure in it, and filling the hole
with dirt again.  After this, you immediately wake up.`);
}

function dun_break(obj: string[] | null) {
  if (!dun_inventory.includes(obj_axe)) {
    dun_mprincl("You have nothing you can use to break things.");
    return;
  }
  const objnum = objnum_from_args_std(obj);
  if (objnum == null) return;

  if (dun_inventory.includes(objnum)) {
    dun_mprincl(
      "You take the object in your hands and swing the axe.  Unfortunately, you miss\nthe object and slice off your hand.  You bleed to death.",
    );
    dun_die("an axe");
    return;
  }
  const here =
    (dun_room_objects[dun_current_room] ?? []).includes(objnum) ||
    (dun_room_silents[dun_current_room] ?? []).includes(objnum);
  if (!here) {
    dun_mprincl("I don't see that here.");
    return;
  }

  if (objnum === obj_cable) {
    dun_mprincl(
      "As you break the ethernet cable, everything starts to blur.  You collapse\nfor a moment, then straighten yourself up.\n",
    );
    dun_room_objects[gamma_computing_center] = [
      ...(dun_room_objects[gamma_computing_center] ?? []),
      ...dun_inventory,
    ];
    if (dun_inventory.includes(obj_key)) {
      dun_inventory = [obj_key];
      dun_remove_obj_from_room(gamma_computing_center, obj_key);
    } else {
      dun_inventory = [];
    }
    dun_current_room = computer_room;
    dun_ethernet = false;
    dun_mprincl("Connection closed.");
    dun_unix_interface();
    return;
  }
  if (objnum < 0) {
    dun_mprincl("Your axe shatters into a million pieces.");
    dun_remove_obj_from_inven(obj_axe);
  } else {
    dun_mprincl("Your axe breaks it into a million pieces.");
    dun_remove_obj_from_room(dun_current_room, objnum);
  }
}

function dun_drive() {
  if (!dun_inbus) {
    dun_mprincl("You cannot drive when you aren't in a vehicle.");
    return;
  }
  dun_mprincl("To drive while you are in the bus, just give a direction.");
}

function dun_superb() {
  dun_mode = "dun-superb";
}

/* ----------------- Scoring helpers ------------------------- */

function dun_reg_score(): number {
  let total = 0;
  for (const x of dun_room_objects[treasure_room] ?? [])
    total += dun_object_pts[x] ?? 0;
  if ((dun_room_objects[treasure_room] ?? []).includes(obj_URINE)) total = 0;
  return total;
}
function dun_endgame_score(): number {
  let total = 0;
  for (const x of dun_room_objects[endgame_treasure_room] ?? [])
    total += dun_object_pts[x] ?? 0;
  return total;
}

/* ------------------ Endgame Q/A ---------------------------- */

function dun_answer(args: string[] | null) {
  if (!dun_correct_answer) {
    dun_mprincl("I don't believe anyone asked you anything.");
    return;
  }
  const a = args?.[0];
  if (!a) {
    dun_mprincl("You must give the answer on the same line.");
    return;
  }
  if (members(a, dun_correct_answer)) {
    dun_mprincl("Correct.");
    if (dun_lastdir === 0) dun_current_room = dun_current_room + 1;
    else dun_current_room = dun_current_room - 1;
    dun_correct_answer = null;
  } else {
    dun_mprincl("That answer is incorrect.");
  }
}
function dun_endgame_question_fn() {
  if (!dun_endgame_questions.length) {
    dun_mprincl("Your question is:");
    dun_mprincl("No more questions, just do ‘answer foo’.");
    dun_correct_answer = ["foo"];
    return;
  }
  const which = Math.floor(Math.random() * dun_endgame_questions.length);
  dun_mprincl("Your question is:");
  dun_endgame_question = dun_endgame_questions[which][0];
  dun_mprincl(dun_endgame_question);

  dun_correct_answer = dun_endgame_questions[which].slice(1);
  // remove asked question
  dun_endgame_questions.splice(which, 1);
}

/* ---------------- UNIX emulation (browser-adapted) --------- */

function dun_unix_interface() {
  dun_login();
  if (dun_logged_in) {
    dungeon_mode = "unix";
    dun_mprinc("$ ");
  }
}

function dun_login() {
  let tries = 4;
  while (!dun_logged_in && tries-- > 0) {
    dun_mprinc("\n\nUNIX System V, Release 2.2 (pokey)\n\nlogin: ");
    const username = dun_read_line();
    dun_mprinc("\npassword: ");
    const password = dun_read_line();
    dun_mprinc("\n");
    if (username !== "toukmond" || password !== "robert") {
      dun_mprincl("login incorrect");
    } else {
      dun_logged_in = true;
      dun_mprincl(`
Welcome to Unix

Please clean up your directories.  The filesystem is getting full.
Our tcp/ip link to gamma is a little flaky, but seems to work.
The current version of ftp can only send files from your home
directory, and deletes them after they are sent!  Be careful.

Note: Restricted bourne shell in use.
`);
    }
  }
  dungeon_mode = "dungeon";
}

function dun_ls(args?: string[]) {
  if (args && args[0]) {
    const ocdpath = dun_cdpath,
      ocdroom = dun_cdroom;
    if (dun_cd(args) !== -2) dun_ls([]);
    dun_cdpath = ocdpath;
    dun_cdroom = ocdroom;
    return;
  }
  if (dun_cdroom === -10) return dun_ls_inven();
  if (dun_cdroom === -2) return dun_ls_rooms();
  if (dun_cdroom === -3) return dun_ls_root();
  if (dun_cdroom === -4) return dun_ls_usr();
  if (dun_cdroom > 0) return dun_ls_room();
}

function dun_ls_root() {
  dun_mprincl(`total 4
drwxr-xr-x  3 root     staff           512 Jan 1 1970 .
drwxr-xr-x  3 root     staff          2048 Jan 1 1970 ..
drwxr-xr-x  3 root     staff          2048 Jan 1 1970 usr
drwxr-xr-x  3 root     staff          2048 Jan 1 1970 rooms`);
}
function dun_ls_usr() {
  dun_mprincl(`total 4
drwxr-xr-x  3 root     staff           512 Jan 1 1970 .
drwxr-xr-x  3 root     staff          2048 Jan 1 1970 ..
drwxr-xr-x  3 toukmond restricted      512 Jan 1 1970 toukmond`);
}
function dun_ls_rooms() {
  dun_mprincl(`total 16
drwxr-xr-x  3 root     staff           512 Jan 1 1970 .
drwxr-xr-x  3 root     staff          2048 Jan 1 1970 ..`);
  for (const x of dun_visited) {
    dun_mprinc("drwxr-xr-x  3 root     staff           512 Jan 1 1970 ");
    dun_mprincl(dun_room_shorts[x]);
  }
}
function dun_ls_room() {
  dun_mprincl(`total 4
drwxr-xr-x  3 root     staff           512 Jan 1 1970 .
drwxr-xr-x  3 root     staff          2048 Jan 1 1970 ..
-rwxr-xr-x  3 root     staff          2048 Jan 1 1970 description`);
  for (const x of dun_room_objects[dun_cdroom] ?? []) {
    if (x >= 0 && x !== obj_special) {
      dun_mprinc("-rwxr-xr-x  1 toukmond restricted        0 Jan 1 1970 ");
      dun_mprincl(dun_objfiles[x]);
    }
  }
}
function dun_ls_inven() {
  dun_mprinc(`total 467
drwxr-xr-x  3 toukmond restricted      512 Jan 1 1970 .
drwxr-xr-x  3 root     staff          2048 Jan 1 1970 ..\n`);
  for (const k of Object.keys(dun_unix_verbs)) {
    if (k !== "IMPOSSIBLE") {
      dun_mprinc("-rwxr-xr-x  1 toukmond restricted    10423 Jan 1 1970 ");
      dun_mprinc(k);
    }
  }
  dun_mprinc("\n");
  if (!dun_uncompressed) {
    dun_mprincl(
      "-rwxr-xr-x  1 toukmond restricted        0 Jan 1 1970 paper.o.Z",
    );
  }
  for (const x of dun_inventory) {
    dun_mprinc("-rwxr-xr-x  1 toukmond restricted        0 Jan 1 1970 ");
    dun_mprincl(dun_objfiles[x]);
  }
}

function dun_echo(args?: string[]) {
  let nomore = false;
  for (const x of args ?? []) {
    if (nomore) break;
    if (!x.startsWith("$")) {
      dun_mprinc(x + " ");
    } else {
      const varname = x.slice(1);
      if (dun_restricted.has(varname)) {
        dun_mprinc(varname + ": Permission denied");
        nomore = true;
      } else dun_mprinc(" ");
    }
  }
  dun_mprinc("\n");
}

function dun_ftp(args?: string[]) {
  if (!args || !args[0]) {
    dun_mprincl("ftp: hostname required on command line.");
    return;
  }
  const host = args[0].toLowerCase();
  if (!["gamma", "endgame"].includes(host)) {
    dun_mprincl("ftp: Unknown host.");
    return;
  }
  if (host === "endgame") {
    dun_mprincl("ftp: connection to endgame not allowed");
    return;
  }
  if (!dun_ethernet) {
    dun_mprincl("ftp: host not responding.");
    return;
  }
  dun_mprincl("Connected to gamma. FTP ver 0.9 00:00:00 01/01/70");
  dun_mprinc("Username: ");
  const username = dun_read_line();
  if (username === "toukmond") {
    dun_mprincl("\ntoukmond ftp access not allowed.");
    return;
  }

  if (username === "anonymous") {
    dun_mprincl("\nGuest login okay, send your user ident as password.");
  } else {
    dun_mprinc("\nPassword required for ");
    dun_mprincl(username);
  }
  dun_mprinc("Password: ");
  const ident = dun_read_line();
  if (username !== "anonymous") {
    dun_mprincl("\nLogin failed.");
    return;
  }
  if (ident.length === 0) {
    dun_mprincl("\nPassword is required.");
    return;
  }
  dun_mprincl("\nGuest login okay, user access restrictions apply.");

  // command loop (simple prompt-based)
  dun_ftp_commands();

  // record endgame Q text modification
  const newlist = [
    "What password did you use during anonymous ftp to gamma?",
    ident,
  ];
  // replace question 2 (index 1) like original
  if (dun_endgame_questions.length > 1) dun_endgame_questions[1] = newlist;
}

function dun_ftp_commands() {
  dun_exitf = false;
  while (!dun_exitf) {
    const line = dun_read_line("ftp> ");
    const r = dun_parse2(
      null,
      {
        type: dun_ftptype_fn,
        binary: dun_bin,
        bin: dun_bin,
        send: dun_send,
        put: dun_send,
        quit: dun_ftpquit,
        help: dun_ftphelp,
        ascii: dun_fascii,
      },
      line,
    );
    if (r === -1) dun_mprincl("No such command.  Try help.");
  }
  dun_ftptype = "ascii";
}
function dun_ftptype_fn(args?: string[]) {
  if (!args || !args[0]) {
    dun_mprincl("Usage: type [binary | ascii]");
    return;
  }
  const a = args[0].toLowerCase();
  if (a === "binary") dun_bin();
  else if (a === "ascii") dun_fascii();
  else dun_mprincl("Unknown type.");
}
function dun_bin() {
  dun_mprincl("Type set to binary.");
  dun_ftptype = "binary";
}
function dun_fascii() {
  dun_mprincl("Type set to ascii.");
  dun_ftptype = "ascii";
}
function dun_ftpquit() {
  dun_exitf = true;
}
function dun_send(args?: string[]) {
  if (!args || !args[0]) {
    dun_mprincl("Usage: send <filename>");
    return;
  }
  const fname = args[0];

  if (dun_unix_verbs[fname]) {
    // sending a command
    delete (dun_unix_verbs as any)[fname]; // mark IMPOSSIBLE
    dun_mprinc(
      "Sending " +
        dun_ftptype +
        " file for " +
        fname +
        "\nTransfer complete.\n",
    );
    return;
  }

  let counter = 0,
    found = false;
  for (const x of dun_objfiles) {
    if (x === fname) {
      if (!dun_inventory.includes(counter)) {
        dun_mprincl("No such file.");
        found = true;
        break;
      }
      dun_mprinc(
        "Sending " +
          dun_ftptype +
          " file for " +
          dun_objects[counter][1].toLowerCase() +
          ", (0 bytes)\n",
      );
      if (dun_ftptype !== "binary") {
        if (
          !(dun_room_objects[receiving_room] ?? []).includes(obj_protoplasm)
        ) {
          dun_room_objects[receiving_room] = [
            ...(dun_room_objects[receiving_room] ?? []),
            obj_protoplasm,
          ];
        }
        dun_remove_obj_from_inven(counter);
      } else {
        dun_remove_obj_from_inven(counter);
        dun_room_objects[receiving_room] = [
          ...(dun_room_objects[receiving_room] ?? []),
          counter,
        ];
      }
      found = true;
      dun_mprincl("Transfer complete.");
      break;
    }
    counter++;
  }
  if (!found) dun_mprincl("No such file.");
}
function dun_ftphelp() {
  dun_mprincl(
    "Possible commands are:\nsend    quit    type   ascii  binary   help",
  );
}

function dun_uexit() {
  dungeon_mode = "dungeon";
  dun_mprincl("\nYou step back from the console.");
  dun_messages();
}

function dun_pwd() {
  dun_mprincl(dun_cdpath);
}
function dun_uncompress(args?: string[]) {
  if (!args || !args[0]) {
    dun_mprincl("Usage: uncompress <filename>");
    return;
  }
  const a = args[0].toLowerCase();
  if (dun_uncompressed || (a !== "paper.o" && a !== "paper.o.z")) {
    dun_mprincl("Uncompress command failed.");
    return;
  }
  dun_uncompressed = true;
  dun_inventory.push(obj_paper);
}
function dun_rlogin(args?: string[]) {
  if (!args || !args[0]) {
    dun_mprincl("Usage: rlogin <hostname>");
    return;
  }
  const host = args[0].toLowerCase();
  if (host === "endgame") return dun_rlogin_endgame();
  if (host !== "gamma") {
    if (host === "pokey") dun_mprincl("Can't rlogin back to localhost");
    else dun_mprincl("No such host.");
    return;
  }
  if (!dun_ethernet) {
    dun_mprincl("Host not responding.");
    return;
  }
  dun_mprinc("Password: ");
  const passwd = dun_read_line();
  if (passwd !== "worms") {
    dun_mprincl("\nlogin incorrect");
    return;
  }
  dun_mprinc(
    "\nYou begin to feel strange for a moment, and you lose your items.\n",
  );
  dun_room_objects[computer_room] = [
    ...(dun_room_objects[computer_room] ?? []),
    ...dun_inventory,
  ];
  dun_inventory = [];
  dun_current_room = receiving_room;
  dun_uexit();
}

function dun_cd(args?: string[]): any {
  if (!args || !args[0]) {
    dun_mprincl("Usage: cd <path>");
    return -2;
  }
  let tcdpath = dun_cdpath,
    tcdroom = dun_cdroom;
  dun_badcd = null;
  let path_elements: string[];
  try {
    path_elements = get_path(args[0], []);
  } catch {
    dun_mprincl("Invalid path");
    dun_badcd = true;
    return -2;
  }
  for (const pe of path_elements) {
    if (dun_badcd) break;
    if (pe === ".") continue;
    if (pe === "..") {
      if (tcdroom > 0) {
        tcdpath = "/rooms";
        tcdroom = -2;
      } else if (tcdroom === -2 || tcdroom === -4 || tcdroom === -3) {
        tcdpath = "/";
        tcdroom = -3;
      } else if (tcdroom === -10) {
        tcdpath = "/usr";
        tcdroom = -4;
      }
    } else if (pe === "/") {
      tcdpath = "/";
      tcdroom = -3;
    } else if (tcdroom === -4) {
      if (pe === "toukmond") {
        tcdpath = "/usr/toukmond";
        tcdroom = -10;
      } else {
        return dun_nosuchdir();
      }
    } else if (tcdroom === -10) {
      return dun_nosuchdir();
    } else if (tcdroom > 0) {
      return dun_nosuchdir();
    } else if (tcdroom === -3) {
      if (pe === "rooms") {
        tcdpath = "/rooms";
        tcdroom = -2;
      } else if (pe === "usr") {
        tcdpath = "/usr";
        tcdroom = -4;
      } else return dun_nosuchdir();
    } else if (tcdroom === -2) {
      let found = false;
      for (const x of dun_visited) {
        const rs = dun_room_shorts[x];
        if (rs === pe) {
          tcdpath = "/rooms/" + rs;
          tcdroom = x;
          found = true;
          break;
        }
      }
      if (!found) return dun_nosuchdir();
    }
  }
  if (!dun_badcd) {
    dun_cdpath = tcdpath;
    dun_cdroom = tcdroom;
    return 0;
  }
  return -2;
}
function dun_nosuchdir() {
  dun_mprincl("No such directory.");
  dun_badcd = true;
  return -2;
}

function get_path(dirstring: string, startlist: string[]): string[] {
  if (dirstring.length === 0) return startlist;
  if (dirstring.startsWith("/"))
    return get_path(dirstring.slice(1), [...startlist, "/"]);
  const slash = dirstring.indexOf("/");
  if (slash === -1) return [...startlist, dirstring];
  return get_path(dirstring.slice(slash + 1), [
    ...startlist,
    dirstring.slice(0, slash),
  ]);
}

function dun_cat(args?: string[]) {
  if (!args || !args[0]) {
    dun_mprincl("Usage: cat <ascii-file-name>");
    return;
  }
  const name = args[0];
  if (name.includes("/")) {
    dun_mprincl("cat: only files in current directory allowed.");
    return;
  }
  if (dun_cdroom > 0 && name === "description") {
    dun_mprincl(dun_rooms[dun_cdroom][0]);
    return;
  }
  const doto = name.indexOf(".o");
  if (doto !== -1) {
    const checklist =
      dun_cdroom === -10 ? dun_inventory : (dun_room_objects[dun_cdroom] ?? []);
    const oname = name.slice(0, doto);
    const id = dun_objnames.get(oname);
    if (id == null || !checklist.includes(id)) {
      dun_mprincl("File not found.");
      return;
    }
    dun_mprincl("Ascii files only.");
    return;
  }
  if (dun_unix_verbs[name]) {
    dun_mprincl("Ascii files only.");
    return;
  }
  dun_mprincl("File not found.");
}

function dun_rlogin_endgame() {
  if (dun_score(null) !== 90) {
    dun_mprincl("You have not achieved enough points to connect to endgame.");
    return;
  }
  dun_mprincl("\nWelcome to the endgame.  You are a truly noble adventurer.");
  dun_current_room = treasure_room;
  dun_endgame = true;
  dun_room_objects[endgame_treasure_room] = [obj_bill];
  dun_uexit();
}

/* ---------------- DOS emulation (browser-adapted) ---------- */

function dun_dos_parse(line: string) {
  const r = dun_parse2(null, dun_dos_verbs, line);
  if (r === -1) {
    dun_mprincl("Bad command or file name");
  }
}

function dun_dos_interface() {
  dun_dos_boot_msg();
  dungeon_mode = "dos";
  dun_dos_prompt();
}

function dun_dos_type(args?: string[]) {
  if (!args || !args[0]) {
    dun_mprincl("Must supply file name");
    return;
  }
  const a = args[0].toLowerCase();
  if (a === "foo.txt") {
    dun_dos_show_combination();
    return;
  }
  if (a === "command.com") {
    dun_mprincl("Cannot type binary files");
    return;
  }
  dun_mprinc("File not found - ");
  dun_mprincl(a.toUpperCase());
}

function dun_dos_invd() {
  dun_mprincl("Invalid drive specification");
}

function dun_dos_dir(args?: string[]) {
  if (!args || !args[0] || args[0] === "\\") {
    dun_mprincl(`
 Volume in drive A is FOO
 Volume Serial Number is 1A16-08C9
 Directory of A:\\

COMMAND  COM     47845 04-09-91   2:00a
FOO      TXT        40 01-20-93   1:01a
        2 file(s)      47845 bytes
                     1065280 bytes free
`);
  } else {
    dun_mprincl(`
 Volume in drive A is FOO
 Volume Serial Number is 1A16-08C9
 Directory of A:\\

File not found`);
  }
}
function dun_dos_prompt() {
  dun_mprinc("A> ");
}
function dun_dos_boot_msg() {
  const now = new Date();
  dun_mprinc("Current time is " + now.toTimeString().split(" ")[0] + "\n");
  dun_mprinc("Enter new time: ");
  dun_read_line();
  dun_mprinc("\n");
}
function dun_dos_spawn() {
  dun_mprincl("Cannot spawn subshell");
}
function dun_dos_exit() {
  dungeon_mode = "dungeon";
  dun_mprincl("\nYou power down the machine and step back.");
  dun_messages();
}
function dun_dos_no_disk() {
  dun_mprincl("Boot sector not found");
}
function dun_dos_show_combination() {
  dun_mprinc("\nThe combination is " + dun_combination + ".\n");
}
function dun_dos_nil() {
  /* noop */
}

/* ---------------- Save/Restore (browser-localStorage) ------ */

let dun_inventory: number[] = []; // start inventory handled in dunnet()

function rot13(s: string) {
  return s.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}

function dun_save_game(args?: string[]) {
  const filename = args?.[0];
  if (!filename) {
    dun_mprincl("You must supply a filename for the save.");
    return;
  }
  dun_numsaves += 1;
  // collect state (same list as original save)
  const snapshot = {
    dun_current_room,
    dun_computer,
    dun_combination,
    dun_visited,
    dun_diggables,
    dun_key_level,
    dun_floppy,
    dun_numsaves,
    dun_numcmds,
    dun_logged_in,
    dungeon_mode,
    dun_jar,
    dun_lastdir,
    dun_black,
    dun_nomail,
    dun_unix_verbs,
    dun_hole,
    dun_uncompressed,
    dun_ethernet,
    dun_sauna_level,
    dun_room_objects,
    dun_room_silents,
    dun_inventory,
    dun_endgame_questions,
    dun_endgame,
    dun_cdroom,
    dun_cdpath,
    dun_correct_answer,
    dun_inbus,
  };
  try {
    const data = rot13(JSON.stringify(snapshot));
    localStorage.setItem("dun-save-" + filename, data);
    dun_do_logfile("save", null);
    dun_mprincl("Done.");
  } catch {
    dun_mprincl("Error saving to file.");
  }
}

function dun_restore(args?: string[]) {
  const filename = args?.[0];
  if (!filename) {
    dun_mprincl("You must supply a filename.");
    return;
  }
  const data = localStorage.getItem("dun-save-" + filename);
  if (!data) {
    dun_mprincl("Could not load restore file.");
    return;
  }
  try {
    const snap = JSON.parse(rot13(data));
    // restore
    ({
      dun_current_room,
      dun_computer,
      dun_combination,
      dun_visited,
      dun_diggables,
      dun_key_level,
      dun_floppy,
      dun_numsaves,
      dun_numcmds,
      dun_logged_in,
      dungeon_mode,
      dun_jar,
      dun_lastdir,
      dun_black,
      dun_nomail,
      dun_unix_verbs,
      dun_hole,
      dun_uncompressed,
      dun_ethernet,
      dun_sauna_level,
      dun_room_objects,
      dun_room_silents,
      dun_inventory,
      dun_endgame_questions,
      dun_endgame,
      dun_cdroom,
      dun_cdpath,
      dun_correct_answer,
      dun_inbus,
    } = snap);
    dun_mprincl("Done.");
    room = 0;
    dun_messages();
  } catch {
    dun_mprincl("Could not load restore file.");
  }
}

/** Browser adaptation: write score log to localStorage instead of filesystem */
function dun_do_logfile(type: "save" | "dun-die", how: string | null) {
  const now = new Date().toString();
  const entry: any = {
    time: now,
    user: "browser",
    event:
      type === "save"
        ? "saved"
        : dun_endgame_score() === 110
          ? "won"
          : how
            ? `killed by ${how}`
            : "quit",
    at: dun_rooms[Math.abs(room)][1],
    score: dun_endgame_score() > 0 ? 90 + dun_endgame_score() : dun_reg_score(),
    saves: dun_numsaves,
    commands: dun_numcmds,
  };
  const key = "dun-log";
  const arr = JSON.parse(localStorage.getItem(key) || "[]");
  arr.push(entry);
  localStorage.setItem(key, JSON.stringify(arr));
  // also echo to console for visibility
  console.log("[dunnet log]", entry);
}

/* ---------------- Object/Inventory helpers ---------------- */

function dun_remove_obj_from_room(r: number, objnum: number) {
  dun_room_objects[r] = (dun_room_objects[r] ?? []).filter((x) => x !== objnum);
}
function dun_remove_obj_from_inven(objnum: number) {
  dun_inventory = dun_inventory.filter((x) => x !== objnum);
}

function dun_put_objs_in_treas(objlist: number[]) {
  const old = dun_reg_score();
  dun_room_objects[treasure_room] = [
    ...(dun_room_objects[treasure_room] ?? []),
    ...objlist,
  ];
  const now = dun_reg_score();
  if (old !== now) dun_score(null);
}

/* ---------------- Export for manual start ------------------ */
export const GPT5Pro_PortInfo =
  "This is a browser-ported TypeScript version of dunnet.el (GPLv3+).";

/* End of dunnet.ts */
