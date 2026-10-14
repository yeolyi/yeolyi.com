# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow"]
# ///
"""아이폰 스크린샷에 아이폰 프레임을 씌운다(1736×3528 투명 PNG).

uv run .claude/skills/iphone-frame/frame.py <스크린샷...> -o <출력 폴더> [옵션]

  --highlight 파일이름:x,y,w,h   해당 스크린샷의 (스크린샷 픽셀 기준) 영역에 빨간 테두리를 그린다. 여러 번 줄 수 있다.
  --keep-dupes                  거의 같은 스크린샷도 모두 만든다(기본은 앞의 것만 남기고 알려 준다).

스크린샷은 1179×2556(아이폰 15·16 Pro 등) 비율이어야 한다. 다른 비율은 화면 영역 너비에 맞추고 위아래를 자른다.
"""

import argparse
import itertools
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageStat

HERE = Path(__file__).resolve().parent
FRAME = HERE / "assets" / "iphone-frame.png"
# 프레임 안 화면 자리(투명 구멍). 프레임 PNG 를 바꾸면 다시 재야 한다(아래 measure_hole).
SCREEN = (90, 77, 1646, 3451)
RED = (0xEE, 0x22, 0x0C, 255)


def measure_hole(frame: Image.Image):
    m = frame.getchannel("A").point(lambda v: 255 if v < 128 else 0).convert("L")
    ImageDraw.floodfill(m, (frame.width // 2, frame.height // 2), 128)
    return m.point(lambda v: 255 if v == 128 else 0).getbbox()


def fingerprint(im: Image.Image):
    return im.convert("L").resize((32, 70))


def near_same(a: Image.Image, b: Image.Image) -> bool:
    # 평균 밝기 차 3 미만(시계·배터리 정도만 다름)
    return ImageStat.Stat(ImageChops.difference(a, b)).mean[0] < 3


def frame_one(shot: Image.Image, frame: Image.Image, highlights) -> Image.Image:
    l, t, r, b = SCREEN
    w, h = r - l, b - t
    scale = w / shot.width
    screen = shot.convert("RGBA").resize((w, round(shot.height * scale)), Image.LANCZOS)
    if screen.height != h:  # 비율이 다르면 위를 기준으로 자른다
        screen = screen.crop((0, 0, w, h)) if screen.height > h else screen
    if highlights:
        d = ImageDraw.Draw(screen)
        for x, y, hw, hh in highlights:
            box = [x * scale, y * scale, (x + hw) * scale, (y + hh) * scale]
            d.rounded_rectangle(box, radius=min(hw, hh) * scale / 2, outline=RED, width=max(10, round(18 * scale)))
    out = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    out.alpha_composite(screen, (l, t))
    out.alpha_composite(frame)
    return out


def main():
    p = argparse.ArgumentParser()
    p.add_argument("shots", nargs="+", type=Path)
    p.add_argument("-o", "--out", type=Path, required=True)
    p.add_argument("--highlight", action="append", default=[], help="파일이름:x,y,w,h")
    p.add_argument("--keep-dupes", action="store_true")
    a = p.parse_args()

    frame = Image.open(FRAME).convert("RGBA")
    if measure_hole(frame) != SCREEN:
        sys.exit(f"프레임 화면 자리가 바뀌었어요: {measure_hole(frame)} — SCREEN 을 고쳐 주세요")

    marks: dict[str, list] = {}
    for h in a.highlight:
        name, box = h.rsplit(":", 1)
        marks.setdefault(name, []).append(tuple(float(v) for v in box.split(",")))

    shots = [(s, Image.open(s)) for s in a.shots]
    skip = set()
    if not a.keep_dupes:
        prints = [fingerprint(im) for _, im in shots]
        for i, j in itertools.combinations(range(len(shots)), 2):
            if j not in skip and near_same(prints[i], prints[j]):
                skip.add(j)
                print(f"거의 같아서 건너뜀: {shots[j][0].name} (= {shots[i][0].name})")

    a.out.mkdir(parents=True, exist_ok=True)
    for i, (path, im) in enumerate(shots):
        if i in skip:
            continue
        dest = a.out / f"{path.stem}-frame.png"
        frame_one(im, frame, marks.get(path.name, [])).save(dest, optimize=True)
        print(dest)


if __name__ == "__main__":
    main()
