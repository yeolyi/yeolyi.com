# GPT 글 기술 스펙

브라우저에서 char(자모)-level GPT를 학습·추론하는 인터랙티브 글. 기획·검증
기록은 메모리(gpt-article.md) 참조.

## 확정 파라미터 (프로토타입 실측 기반)

- 모델: 6 layer / 6 head / 192 dim / block 256 → 2.75M 파라미터
- 토크나이저: 한글 자모 분해(String.normalize 기반), 실록 vocab 143
- 학습: WebGPU에서 batch 64, adam(1e-3). 실측 ~1.9 it/s → 15분 ≈ 1,700 iter
- 품질 기준점(PyTorch 실측): iter 1,000(16M tokens)에 실록체 인식 가능, iter
  4,095에 val loss 1.15
- 생성: ~21ms/token, temperature 스트리밍

## 구조

```
src/post/gpt/
  lib/
    config.ts        모델·학습 설정, 기본값
    tokenizer.ts     자모 분해/재조합, vocab 빌드
    ngram.ts         bigram 표 + 문맥 k 생성기 (2·3절 컴포넌트용)
    model.ts         tfjs GPT (low-level ops): 파라미터 생성, forward
    sampler.ts       temperature 샘플링 생성 루프
    checkpoint.ts    가중치 (역)직렬화 fp16, IndexedDB, fetch 로더
    protocol.ts      워커 메시지 타입
    trainWorker.ts   학습 워커: 루프, 주기 샘플, val loss
    useTrainer.ts    (예정) 워커를 감싸는 React 훅
  components/        (예정) 절별 컴포넌트
public/gpt/
  sillok.txt         정제 실록 국역 코퍼스 (~4MB)
  sillok-gpt.json + .bin   사전학습 체크포인트 (fp16)
```

## 워커 프로토콜

main → worker: `init{corpusText,config}` `start` `pause`
`generate{prompt,temperature,maxTokens}` `loadWeights{buffer}` `exportWeights`
worker → main: `ready{vocabSize,paramCount,backend}`
`progress{iter,loss,valLoss?,itPerSec,tokensSeen}` `sampleText{text,iter}`
`token{char}`(생성 스트리밍) `generateDone` `weights{header,buffer}`
`error{message}`

## 결정 사항

- attention dropout 없음 (검증 조건과 동일, MPS 이슈 회피와도 일치)
- 생성 샘플 끝의 미완성 자모는 표시 전 제거
- 코퍼스 출처: 국사편찬위 실록 국역(공공누리 1유형, 출처 표기 필요). HF
  blubarrybagel/FRAG_sillok_dataset에서 정제. 정제 스크립트는 scripts/ 참조
- 사전학습 체크포인트는 파이썬 학습 결과를 fp16으로 export (스크립트 추후)
