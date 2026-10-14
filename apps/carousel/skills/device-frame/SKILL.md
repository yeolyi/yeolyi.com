---
name: device-frame
description: 아이폰·아이패드 스크린샷에 기기 프레임(목업)을 씌워 캐러셀에 넣을 이미지를 만든다. 사용자가 스크린샷을 "목업으로", "프레임 씌워서", "폰/태블릿 화면처럼" 넣어 달라고 할 때 쓴다. 여러 장이면 거의 같은 스크린샷을 걸러 내고, 강조할 부분에 빨간 테두리를 그릴 수 있다.
---

# 기기 프레임 씌우기

```sh
uv run skills/device-frame/frame.py <스크린샷...> -o <출력 폴더> [--device iphone|ipad] [--highlight 파일이름:x,y,w,h ...] [--keep-dupes]
```

uv 가 패키지를 못 받는 환경이면 Pillow 가 있는 `python3` 로 그대로 돌려도 된다.

| 기기 | 결과 크기 | 화면 자리 | 맞는 캡처 |
|---|---|---|---|
| `iphone` | 1736×3528 | (90, 77)–(1646, 3451) | 1179×2556 = 393×852pt @3x |
| `ipad` | 1812×2550 | (72, 72)–(1740, 2476) | 1640×2360 = 820×1180pt @2x |

- 결과는 `<원래 이름>-<기기>.png`, 프레임 바깥은 투명이다. 캐러셀에 넣으면 `nw`·`nh` 가 위 결과 크기다.
- `--device` 를 안 주면 스크린샷 비율이 가까운 기기를 고른다. 화면 자리와 비율이 다르면 너비에 맞추고 위를 기준으로 자른다.
- **웹 화면을 찍을 때**: Playwright 로 위 pt 크기 뷰포트·배율로 찍는다. 넘침(가로 스크롤)을 보여 줘야 하면 `chromium.launch({ ignoreDefaultArgs: ["--hide-scrollbars"] })` 로 스크롤바를 켜고 `isMobile: false` 로 찍는다(모바일 에뮬레이션은 스크롤바를 숨긴다).
- **중복 걸러 내기**: 시계·배터리만 다른 거의 같은 스크린샷은 앞의 것만 만들고 "거의 같아서 건너뜀"으로 알려 준다. 모두 만들려면 `--keep-dupes`.
- **강조**: `--highlight IMG_5232.PNG:1118,1050,58,682` 처럼 스크린샷 픽셀 좌표로 영역을 주면 빨간(#EE220C) 둥근 테두리를 그린다.

## 순서

1. AirDrop 으로 받은 스크린샷은 `~/Downloads` 에 `IMG_xxxx.PNG` 로 들어온다. 수정 시각 순으로 모아 한 장짜리 미리보기(축소해서 나란히)를 만들어 흐름과 중복을 먼저 본다.
2. 강조할 곳의 좌표를 찾는다.
3. 위 명령으로 프레임을 씌운다.
4. 덱에 넣을 땐 carousel 스킬의 `upload` 로 올리고 나온 `src`·`nw`·`nh` 를 이미지 레이어에 쓴다. 프레임을 캔버스 밖으로 걸치거나 `crop` 으로 위·아래만 잘라 쓰기도 한다.

## 에셋

- `assets/iphone-frame.png`: Figma Community "iPhone mockups (Community)"의 프레임(어두운 티타늄).
- `assets/ipad-frame.png`: Figma Community "Apple Frames (Community)"의 `iPad_gray_2x` 프레임. 내보낸 PNG 의 캔버스 배경과 화면 자리를 투명으로 뚫었다(화면 모서리 반지름 36).
- 프레임을 바꾸면 `frame.py` 가 화면 자리를 다시 재서 `DEVICES` 와 다르면 멈춘다.
