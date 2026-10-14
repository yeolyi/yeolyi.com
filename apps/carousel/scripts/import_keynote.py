"""Keynote(.key) → decks/<이름>/deck.json 변환.

pnpm import-key <파일.key> [덱 폴더 이름]

keynote-parser 로 .key 를 YAML 로 풀어 읽는다(텍스트 런·크롭 마스크·z 순서까지 AppleScript 로는 안 나와서).
가져오는 것: 텍스트 상자(굵게·빨강·밑줄·정렬·캡션), 이미지(위치·크기·크롭), 순서, 발표자 노트(→ memo).
버리는 것: 워터마크(@yeol.dev, 앱이 자동으로 넣는다), 도형·선(가리기 상자 포함), 회전.
"""

import glob
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import yaml
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DECKS = ROOT / "decks"

# Keynote 텍스트 상자는 안쪽 여백이 있어 글자가 상자 원점보다 안쪽에서 시작한다.
# 실제 내보낸 JPEG 과 겹쳐 보며 맞춘 값.
TEXT_INSET_X = 2
TEXT_INSET_Y = -2
AUTO_SLACK = 40

warnings: list[str] = []


def load_objects(unpacked: Path):
    objs = {}
    for f in glob.glob(str(unpacked / "Index" / "*.yaml")):
        with open(f) as fp:
            d = yaml.load(fp, Loader=getattr(yaml, "CSafeLoader", yaml.SafeLoader))
        for ch in d.get("chunks", []):
            for a in ch.get("archives", []):
                objs[a["header"]["identifier"]] = a["objects"][0]
    return objs


def ref(o, key):
    v = o.get(key) if o else None
    return v.get("identifier") if isinstance(v, dict) else None


def style_props(objs, sid, key):
    """스타일 부모 사슬을 따라 charProperties/paraProperties 를 합친다(자식 우선)."""
    chain = []
    while sid and sid in objs:
        s = objs[sid]
        chain.append(s.get(key, {}) or {})
        sid = ref(s.get("super", {}), "parent")
    out = {}
    for props in reversed(chain):
        out.update(props)
    return out


def table(storage, name):
    return storage.get(name, {}).get("entries", [])


def is_red(c):
    return bool(c) and c.get("r", 0) > 0.7 and c.get("g", 1) < 0.35 and c.get("b", 1) < 0.35


def is_gray(c):
    if not c:
        return False
    r, g, b = c.get("r", 0), c.get("g", 0), c.get("b", 0)
    return max(r, g, b) - min(r, g, b) < 0.05 and 0.3 < r < 0.9


def text_runs(objs, storage):
    text = "".join(storage.get("text", [])).replace("\u2028", "\n")  # Keynote 의 줄 나눔(⇧↩)
    para_entries = table(storage, "tableParaStyle")
    char_entries = table(storage, "tableCharStyle")
    bounds = sorted({0, len(text)} | {e["characterIndex"] for e in para_entries + char_entries if e["characterIndex"] <= len(text)})

    def at(entries, i, sticky):
        cur = None
        for e in entries:
            if e["characterIndex"] > i:
                break
            if "object" in e:
                cur = e["object"]["identifier"]
            elif not sticky:
                cur = None
        return cur

    runs = []
    align = None
    size = None
    for a, b in zip(bounds, bounds[1:]):
        if a >= b:
            continue
        pid = at(para_entries, a, sticky=True)
        cid = at(char_entries, a, sticky=False)
        pc = style_props(objs, pid, "charProperties")
        pp = style_props(objs, pid, "paraProperties")
        cc = style_props(objs, cid, "charProperties") if cid else {}
        props = {**pc, **cc}
        if align is None:
            align = pp.get("alignment")
        if size is None:
            size = props.get("fontSize")
        font = props.get("fontName", "")
        runs.append(
            {
                "text": text[a:b],
                "bold": bool(props.get("bold")) or "Bold" in font,
                "color": props.get("fontColor"),
                "underline": props.get("underline", "kNoUnderline") not in ("kNoUnderline", None),
                "font": font,
            }
        )
    return text, runs, align, size


def to_markup(runs, base_red):
    out = ""
    st = {"bold": False, "red": False, "underline": False}
    marks = [("red", "=="), ("bold", "**"), ("underline", "__")]
    for r in runs:
        want = {"bold": r["bold"], "red": is_red(r["color"]) and not base_red, "underline": r["underline"]}
        for line_i, part in enumerate(r["text"].split("\n")):
            if line_i > 0:
                for k, m in reversed(marks):
                    if st[k]:
                        out += m
                        st[k] = False
                out += "\n"
            if not part:
                continue
            # 공백만 있는 조각은 서식을 바꾸지 않는다(마크가 공백을 감싸지 않게).
            if part.strip():
                for k, m in reversed(marks):
                    if st[k] and not want[k]:
                        out += m
                        st[k] = False
                for k, m in marks:
                    if not st[k] and want[k]:
                        out += m
                        st[k] = True
            out += part
    for k, m in reversed(marks):
        if st[k]:
            out += m
    return out


def geometry(o):
    g = o.get("super", {}).get("geometry") or o.get("super", {}).get("super", {}).get("geometry") or {}
    p, s = g.get("position", {}), g.get("size", {})
    # 텍스트 상자는 geometry 크기가 0 이고 실제 크기는 pathsource 에 있다.
    natural = o.get("super", {}).get("pathsource", {}).get("bezierPathSource", {}).get("naturalSize", {})
    return {
        "x": p.get("x", 0.0),
        "y": p.get("y", 0.0),
        "w": s.get("width") or natural.get("width", 0.0),
        "h": s.get("height") or natural.get("height", 0.0),
        "auto": not s.get("width"),
        "angle": g.get("angle", 0.0),
    }


def safe_name(name):
    stem, ext = os.path.splitext(name)
    stem = re.sub(r"-\d+$", "", stem)  # Keynote 가 붙인 -12345 꼬리
    stem = re.sub(r"[^\w가-힣.-]+", "-", stem).strip("-") or "image"
    return stem[:50], ext.lower()


def import_image(objs, datas, unpacked, assets, o, off, used):
    did = ref(o, "data")
    data = datas.get(did)
    if not data or not data.get("fileName"):
        warnings.append(f"이미지 데이터를 못 찾음: {did}")
        return None
    src_file = unpacked / "Data" / data["fileName"]
    stem, ext = safe_name(data.get("preferredFileName") or data["fileName"])
    if ext in (".heic", ".heif", ".tif", ".tiff"):
        ext = ".png"
    name = f"{stem}{ext}"
    n = 2
    while name in used and used[name] != did:
        name = f"{stem}-{n}{ext}"
        n += 1
    used[name] = did
    dest = assets / name
    if not dest.exists():
        if src_file.suffix.lower() in (".heic", ".heif", ".tif", ".tiff"):
            subprocess.run(["sips", "-s", "format", "png", str(src_file), "--out", str(dest)], check=True, capture_output=True)
        else:
            shutil.copy(src_file, dest)
    with Image.open(dest) as im:
        nw, nh = im.size

    g = geometry(o)
    if abs(g["angle"]) > 0.01:
        warnings.append(f"{name}: 회전 {g['angle']:.1f}° 는 무시함")
    fx, fy, fw, fh = g["x"] + off[0], g["y"] + off[1], g["w"], g["h"]
    rx, ry, rw, rh = fx, fy, fw, fh
    mid = ref(o, "mask")
    if mid and mid in objs:
        m = geometry(objs[mid])
        # 마스크 좌표는 이미지 프레임 기준이다.
        rx, ry, rw, rh = fx + m["x"], fy + m["y"], m["w"], m["h"]
        # 마스크가 이미지 밖으로 나간 부분은 어차피 비어 있다.
        x0, y0 = max(rx, fx), max(ry, fy)
        x1, y1 = min(rx + rw, fx + fw), min(ry + rh, fy + fh)
        rx, ry, rw, rh = x0, y0, max(1, x1 - x0), max(1, y1 - y0)
    crop = {
        "x": round((rx - fx) / fw, 5),
        "y": round((ry - fy) / fh, 5),
        "w": round(rw / fw, 5),
        "h": round(rh / fh, 5),
    }
    return {
        "type": "image",
        "src": f"assets/{name}",
        "nw": nw,
        "nh": nh,
        "x": round(rx, 2),
        "y": round(ry, 2),
        "w": round(rw, 2),
        "h": round(rh, 2),
        "crop": crop,
    }


def import_text(objs, o, off):
    sid = ref(o, "ownedStorage") or ref(o, "deprecatedStorage")
    storage = objs.get(sid)
    if not storage:
        return None
    text, runs, align, size = text_runs(objs, storage)
    if not text.strip():
        return None
    if text.strip().startswith("@yeol"):
        return None  # 워터마크는 앱이 넣는다
    g = geometry(o)
    visible = [r for r in runs if r["text"].strip()]
    if size and size > 100:
        warnings.append(f"{size:.0f}pt 짜리 큰 글자(이모지 등)는 뺐어요. 이미지로 넣어 주세요: {text.strip()[:10]!r}")
        return None
    base_red = bool(visible) and all(is_red(r["color"]) for r in visible)
    caption = bool(visible) and all(is_gray(r["color"]) for r in visible) or (size is not None and size < 36)
    if size and abs(size - (30 if caption else 40)) > 0.5:
        warnings.append(f"글자 크기 {size} → {'캡션' if caption else '본문'}으로 맞춤: {text[:20]!r}")
    other = sorted({r["font"] for r in visible if r["font"] and "Pretendard" not in r["font"]})
    if other:
        warnings.append(f"Pretendard 로 바꾼 글꼴 {', '.join(other)}: {text[:20]!r}")
    markup = to_markup(runs, base_red).rstrip("\n")
    align = {"TATvalue1": "right", "TATvalue2": "center", 1: "right", 2: "center"}.get(align, "left")
    if g["auto"]:
        # 크기 자동 맞춤 상자: position 은 정렬 기준점(왼쪽 위·가운데 위·오른쪽 위)이고
        # naturalSize 는 Keynote 글꼴 기준이라 약간 여유를 둬야 줄이 안 바뀐다.
        w = g["w"] + AUTO_SLACK
        x = g["x"] - {"left": -TEXT_INSET_X, "center": w / 2, "right": w + TEXT_INSET_X}[align]
    else:
        w = g["w"] - 2 * TEXT_INSET_X
        x = g["x"] + TEXT_INSET_X
    return {
        "type": "text",
        "style": "caption" if caption else "body",
        "color": "red" if base_red else "black",
        "align": align,
        "x": round(x + off[0], 2),
        "y": round(g["y"] + off[1] + TEXT_INSET_Y, 2),
        "text": markup,
    }


def drawables(objs, datas, unpacked, assets, ids, off, used):
    out = []
    for did in ids:
        o = objs.get(did)
        if not o:
            continue
        t = o.get("_pbtype")
        if t == "TSD.ImageArchive":
            layer = import_image(objs, datas, unpacked, assets, o, off, used)
        elif t == "TSWP.ShapeInfoArchive":
            layer = import_text(objs, o, off)
            if layer is None and not o.get("isTextBox"):
                warnings.append("도형(가리기 상자 등)은 건너뜀. 필요하면 이미지를 직접 고쳐 넣으세요")
        elif t == "TSD.GroupArchive":
            g = geometry(o)
            out += drawables(objs, datas, unpacked, assets, [c["identifier"] for c in o.get("children", [])], (off[0] + g["x"], off[1] + g["y"]), used)
            continue
        else:
            warnings.append(f"지원 안 하는 요소 {t}")
            layer = None
        if layer:
            out.append(layer)
    return out


def note_text(objs, slide):
    note = objs.get(ref(slide, "note"))
    storage = objs.get(ref(note, "containedStorage")) if note else None
    if not storage:
        return ""
    return "".join(storage.get("text", [])).strip()


def main():
    if len(sys.argv) < 2:
        print("사용법: pnpm import-key <파일.key> [덱 폴더 이름]")
        sys.exit(1)
    key = Path(sys.argv[1]).expanduser().resolve()
    slug = sys.argv[2] if len(sys.argv) > 2 else key.stem
    out_dir = DECKS / slug
    if (out_dir / "deck.json").exists():
        print(f"decks/{slug} 가 이미 있어요. 다른 이름을 주거나 지우고 다시 하세요.")
        sys.exit(1)

    with tempfile.TemporaryDirectory() as tmp:
        unpacked = Path(tmp) / "unpacked"
        subprocess.run(
            [str(Path(sys.executable).parent / "keynote-parser"), "unpack", str(key), "--output", str(unpacked)],
            check=True,
            capture_output=True,
        )
        objs = load_objects(unpacked)
        pm = next(o for o in objs.values() if o.get("_pbtype") == "TSP.PackageMetadata")
        datas = {d["identifier"]: d for d in pm.get("datas", [])}
        show = next(o for o in objs.values() if o.get("_pbtype") == "KN.ShowArchive")
        size = show.get("size", {})
        if (size.get("width"), size.get("height")) != (1080.0, 1350.0):
            warnings.append(f"슬라이드 크기가 1080×1350 이 아님: {size}")

        assets = out_dir / "assets"
        assets.mkdir(parents=True, exist_ok=True)
        used = {}
        slides = []
        for node_ref in show["slideTree"]["slides"]:
            node = objs[node_ref["identifier"]]
            if node.get("isSkipped"):
                warnings.append("건너뛴 장은 뺌")
                continue
            slide = objs[ref(node, "slide")]
            ids = [d["identifier"] for d in slide.get("drawablesZOrder", [])]
            slides.append({"memo": note_text(objs, slide), "layers": drawables(objs, datas, unpacked, assets, ids, (0.0, 0.0), used)})

    deck = {"version": 1, "title": key.stem, "watermark": "@yeol.dev", "slides": slides}
    (out_dir / "deck.json").write_text(json.dumps(deck, ensure_ascii=False, indent=2) + "\n")
    print(f"decks/{slug}: {len(slides)}장, 이미지 {len(used)}개")
    for w in dict.fromkeys(warnings):
        print(f"  주의: {w}")


if __name__ == "__main__":
    main()
