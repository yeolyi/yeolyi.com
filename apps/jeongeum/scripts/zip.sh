#!/bin/sh
# ext/ 를 스토어 제출용 zip(kit/jeongeum-<버전>.zip)으로 묶고, 블로그가 배포하는 내려받기 파일
# (apps/blog/public/d/정음.zip)도 같은 내용으로 바꾼다. 버전은 manifest.json 에서 읽는다.
set -e
cd "$(dirname "$0")/.."
version=$(node -p "require('./ext/manifest.json').version")
out="kit/jeongeum-$version.zip"
rm -f "$out"
(cd ext && zip -qr -X "../$out" . -x '.DS_Store')
cp "$out" "../blog/public/d/정음.zip"
echo "$out → apps/blog/public/d/정음.zip"
