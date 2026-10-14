# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow"]
# ///
"""스크린샷에 기기 프레임(아이폰·아이패드)을 씌운다. 결과는 프레임 바깥이 투명한 PNG.

uv run skills/device-frame/frame.py <스크린샷...> -o <출력 폴더> [옵션]

  --device iphone|ipad          프레임. 안 주면 스크린샷 비율로 고른다(세로/가로 0.46 근처 아이폰, 0.69 근처 아이패드).
  --highlight 파일이름:x,y,w,h   해당 스크린샷의 (스크린샷 픽셀 기준) 영역에 빨간 테두리를 그린다. 여러 번 줄 수 있다.
  --keep-dupes                  거의 같은 스크린샷도 모두 만든다(기본은 앞의 것만 남기고 알려 준다).

화면 자리와 비율이 다르면 너비에 맞추고 위를 기준으로 자른다.
"""

import argparse
import itertools
import json
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageStat

HERE = Path(__file__).resolve().parent
# 기기별 프레임 PNG 와 화면 자리(투명 구멍). 웹의 /frame 도 같은 파일을 읽는다.
# 프레임 PNG 를 바꾸면 화면 자리를 다시 재야 한다(아래 measure_hole 이 확인한다).
DEVICES = {
    name: (HERE / d["file"], tuple(d["screen"]))
    for name, d in json.loads((HERE / "frames.json").read_text()).items()
}
RED = (0xEE, 0x22, 0x0C, 255)


def measure_hole(frame: Image.Image):
    m = frame.getchannel("A").point(lambda v: 255 if v < 128 else 0).convert("L")
    ImageDraw.floodfill(m, (frame.width // 2, frame.height // 2), 128)
    return m.point(lambda v: 255 if v == 128 else 0).getbbox()


def pick_device(shot: Image.Image) -> str:
    ratio = shot.width / shot.height
    return min(DEVICES, key=lambda d: abs(ratio - _screen_ratio(d)))


def _screen_ratio(device: str) -> float:
    l, t, r, b = DEVICES[device][1]
    return (r - l) / (b - t)


def fingerprint(im: Image.Image):
    return im.convert("L").resize((32, 70))


def near_same(a: Image.Image, b: Image.Image) -> bool:
    # 평균 밝기 차 3 미만(시계·배터리 정도만 다름)
    return ImageStat.Stat(ImageChops.difference(a, b)).mean[0] < 3


def frame_one(shot: Image.Image, frame: Image.Image, screen_box, highlights) -> Image.Image:
    l, t, r, b = screen_box
    w, h = r - l, b - t
    scale = w / shot.width
    screen = shot.convert("RGBA").resize((w, round(shot.height * scale)), Image.LANCZOS)
    if screen.height > h:
        screen = screen.crop((0, 0, w, h))
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
    p.add_argument("--device", choices=sorted(DEVICES))
    p.add_argument("--highlight", action="append", default=[], help="파일이름:x,y,w,h")
    p.add_argument("--keep-dupes", action="store_true")
    a = p.parse_args()

    frames = {}
    for name, (path, box) in DEVICES.items():
        f = Image.open(path).convert("RGBA")
        if measure_hole(f) != box:
            sys.exit(f"{name} 프레임 화면 자리가 바뀌었어요: {measure_hole(f)} — DEVICES 를 고쳐 주세요")
        frames[name] = f

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
        device = a.device or pick_device(im)
        dest = a.out / f"{path.stem}-{device}.png"
        frame_one(im, frames[device], DEVICES[device][1], marks.get(path.name, [])).save(dest, optimize=True)
        print(f"{dest}  {frames[device].width}×{frames[device].height}")


if __name__ == "__main__":
    main()
