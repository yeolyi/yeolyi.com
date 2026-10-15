# yeolyi.com

이성열의 사이트와 사이드 프로젝트.

| 앱              | 주소                                               |
| --------------- | -------------------------------------------------- |
| `apps/blog`     | [yeolyi.com](https://yeolyi.com)                   |
| `apps/design`   | [design.yeolyi.com](https://design.yeolyi.com)     |
| `apps/house`    | [house.yeolyi.com](https://house.yeolyi.com)       |
| `apps/carousel` | [carousel.yeolyi.com](https://carousel.yeolyi.com) |
| `apps/logic`    | [logic.yeolyi.com](https://logic.yeolyi.com)       |
| `apps/cs`       | [cs.yeolyi.com](https://cs.yeolyi.com)             |
| `apps/stats`    | [stats.yeolyi.com](https://stats.yeolyi.com)       |
| `apps/jeongeum` | 크롬 확장                                          |

지원 브라우저는 [Baseline Widely available](https://web.dev/baseline)(Vite 기본
`build.target`)이다.

## 인프라

- **Vercel**: 앱마다 프로젝트 하나. main에 푸시하면 바뀐 앱만 배포
- **Supabase**: DB·로그인·파일·예약 작업·방문 지표. 프로젝트 하나에 앱마다
  스키마 하나
- **AWS Route 53**: DNS
- **Resend**: 메일

## 개발

```sh
pnpm install
pnpm dev   # 모든 앱, localhost:4321~4327
```
