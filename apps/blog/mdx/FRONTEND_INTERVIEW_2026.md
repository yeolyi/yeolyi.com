# 2026년 프론트엔드 면접 질문 모음

> 각 주제를 블로그 글로 쓰면서 깊이 있게 공부해보세요. 면접에서 나올 법한
> 까다로운 질문들을 함께 정리했습니다.

---

## 1. JavaScript

### setTimeout 0ms는 왜 정확히 0ms가 아닌가

**면접 질문**

- 이 코드의 출력 순서를 예측하고 설명해주세요.

```javascript
console.log("1");
setTimeout(() => console.log("2"), 0);
Promise.resolve().then(() => console.log("3"));
console.log("4");
```

**꼬리질문**

- Microtask와 Macrotask의 차이는?
- `requestAnimationFrame`은 어디에 들어가나요?
- Node.js의 `process.nextTick`은요?

---

### 클로저가 React Hooks를 가능하게 하는 방법

**면접 질문**

- 아래 코드가 왜 3, 3, 3을 출력하는지, 그리고 0, 1, 2를 출력하게 고치는 방법
  3가지를 말해주세요.

```javascript
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
```

**꼬리질문**

- `useState`가 내부적으로 클로저를 어떻게 활용하나요?
- Stale Closure 문제는 왜 발생하고 어떻게 해결하나요?
- 클로저가 메모리 누수를 일으키는 경우는?

---

### 화살표 함수와 this 바인딩의 모든 것

**면접 질문**

- 아래 코드의 각 출력 결과와 이유를 설명해주세요.

```javascript
const obj = {
  name: "Kim",
  sayName: function () {
    console.log(this.name);
  },
  sayNameArrow: () => {
    console.log(this.name);
  },
};

obj.sayName(); // ?
obj.sayNameArrow(); // ?
const fn = obj.sayName;
fn(); // ?
```

**꼬리질문**

- 클래스 메서드에서 `this`가 undefined가 되는 상황과 해결법은?
- `bind`를 두 번 호출하면 어떻게 되나요?

---

### class는 정말 문법적 설탕일 뿐인가

**면접 질문**

- ES6 `class`와 ES5 `prototype` 방식의 차이점을 말해주세요.

```javascript
class Animal {
  constructor(name) {
    this.name = name;
  }
}
// vs
function Animal(name) {
  this.name = name;
}
```

**꼬리질문**

- `instanceof`는 내부적으로 어떻게 동작하나요?
- `Object.create(null)`은 언제 사용하나요?

---

### TDZ(Temporal Dead Zone)가 존재하는 이유

**면접 질문**

- 아래 코드의 출력 결과를 예측하고 TDZ를 설명해주세요.

```javascript
console.log(a); // ?
console.log(b); // ?
var a = 1;
let b = 2;
```

**꼬리질문**

- `const`로 선언한 객체의 속성은 변경 가능한데, 왜 `const`인가요?
- 함수 선언문 vs 함수 표현식의 호이스팅 차이는?

---

### structuredClone이 JSON.parse보다 나은 점

**면접 질문**

- 아래에서 `copy.nested.value`가 바뀌는 이유와 해결법은?

```javascript
const original = { nested: { value: 1 } };
const copy = { ...original };
original.nested.value = 999;
console.log(copy.nested.value); // 999
```

**꼬리질문**

- `structuredClone`이 복사하지 못하는 것은?
- immer 라이브러리가 인기 있는 이유는?

---

## 2. TypeScript

### interface와 type, 언제 무엇을 써야 하나

**면접 질문**

- 차이점 3가지 이상과 각각 언제 쓰는지 말해주세요.

**꼬리질문**

- 선언 병합(Declaration Merging)이 유용한 경우는?
- `type`으로만 표현 가능한 타입은?

---

### any 대신 unknown을 써야 하는 이유

**면접 질문**

- `any`와 `unknown`의 차이는? `unknown`의 장점은?

**꼬리질문**

- `void`와 `undefined`의 차이는?
- `unknown`을 사용할 때 타입을 좁히는 방법들은?

---

### never 타입을 실무에서 활용하는 방법

**면접 질문**

- 아래 코드에서 `never`가 하는 역할은?

```typescript
type Status = "loading" | "success" | "error";

function handleStatus(status: Status) {
  switch (status) {
    case "loading":
      return "로딩중";
    case "success":
      return "성공";
    case "error":
      return "에러";
    default:
      const _exhaustive: never = status;
      return _exhaustive;
  }
}
```

**꼬리질문**

- 새로운 Status가 추가되면 어떻게 되나요?
- `never`를 반환하는 함수의 예시는?

---

### Partial, Pick, Omit 직접 구현해보기

**면접 질문**

- `Partial<T>`를 직접 구현해보세요.
- `Pick<T, K>`와 `Omit<T, K>`의 차이와 구현 방식은?

**꼬리질문**

- `Record<K, T>`는 언제 사용하나요?
- `Required<T>`는 어떻게 구현하나요?

---

### ReturnType 구현으로 이해하는 infer

**면접 질문**

- `ReturnType<T>`를 직접 구현해보세요.

```typescript
type MyReturnType<T> = ???
```

**꼬리질문**

- `infer` 키워드가 하는 역할은?
- `Parameters<T>`는 어떻게 구현하나요?
- 함수의 첫 번째 매개변수 타입만 추출하려면?

---

### Discriminated Union으로 안전한 상태 관리하기

**면접 질문**

- 타입 가드가 필요한 이유와 Discriminated Union의 장점은?

```typescript
type State =
  | { status: "loading" }
  | { status: "success"; data: string }
  | { status: "error"; error: Error };
```

**꼬리질문**

- 사용자 정의 타입 가드(`is`)는 언제 필요한가요?
- `asserts` 키워드는 언제 사용하나요?

---

### 분배적 조건부 타입의 동작 원리

**면접 질문**

- 아래 두 결과가 다른 이유를 설명해주세요.

```typescript
type ToArray<T> = T extends any ? T[] : never;
type A = ToArray<string | number>; // string[] | number[]

type ToArray2<T> = [T] extends [any] ? T[] : never;
type B = ToArray2<string | number>; // (string | number)[]
```

**꼬리질문**

- 분배를 방지하는 방법은?
- `Exclude<T, U>`는 어떻게 동작하나요?

---

### 템플릿 리터럴 타입으로 API 경로 타입 만들기

**면접 질문**

- CSS 단위나 이벤트 핸들러 이름을 타입으로 강제하려면?

```typescript
type CSSValue = `${number}${"px" | "rem" | "%"}`;
type EventHandler = `on${Capitalize<"click" | "focus">}`;
```

**꼬리질문**

- 깊은 객체 경로를 타입으로 표현하려면?
- `Uppercase`, `Lowercase` 등의 활용법은?

---

### satisfies가 as보다 좋은 경우

**면접 질문**

- `satisfies`와 타입 단언(`as`)의 차이는?

```typescript
const palette = {
  red: "#ff0000",
  green: [0, 255, 0],
} satisfies Record<string, string | number[]>;
```

**꼬리질문**

- `satisfies`를 사용했을 때 `palette.red.toUpperCase()`가 되는 이유는?
- 언제 `as`를 써야 하나요?

---

### const 타입 매개변수와 as const의 차이

**면접 질문**

- 아래 `route`의 타입은 무엇인가요?

```typescript
function createRoute<const T>(route: T) {
  return route;
}
const route = createRoute({ path: "/home", exact: true });
```

**꼬리질문**

- `as const`와 뭐가 다른가요?
- 언제 `const` 타입 매개변수를 사용하나요?

---

### NoInfer로 제네릭 추론 제어하기

**면접 질문**

- `NoInfer<T>`가 해결하는 문제는 무엇인가요?

**꼬리질문**

- 여러 매개변수에서 하나만 추론 대상으로 하려면?

---

### DeepPartial 구현으로 이해하는 재귀 타입

**면접 질문**

- `DeepPartial<T>`를 구현해보세요.

```typescript
type DeepPartial<T> = ???
```

**꼬리질문**

- 재귀 타입의 깊이 제한은?
- `DeepReadonly<T>`는 어떻게 구현하나요?

---

## 3. React

### React가 리렌더링을 결정하는 기준

**면접 질문**

- 아래에서 버튼 클릭 시 Child가 리렌더링되나요?

```jsx
function Parent() {
  const [count, setCount] = useState(0);
  return (
    <>
      <button onClick={() => setCount((c) => c + 1)}>+</button>
      <Child />
    </>
  );
}
```

**꼬리질문**

- 리렌더링을 막으려면 어떻게 하나요?
- `React.memo`를 모든 컴포넌트에 쓰면 안 되는 이유는?

---

### key에 index를 쓰면 안 되는 진짜 이유

**면접 질문**

- 구체적인 버그 예시와 함께 설명해주세요.

**꼬리질문**

- key가 같으면 React는 어떻게 동작하나요?
- key로 적합한 값은?

---

### useEffect의 Race Condition 해결하기

**면접 질문**

- 아래 코드의 문제점과 해결법은?

```jsx
function SearchResults({ query }) {
  const [results, setResults] = useState([]);
  useEffect(() => {
    fetchResults(query).then(setResults);
  }, [query]);
  return (
    <ul>
      {results.map((r) => (
        <li key={r.id}>{r.name}</li>
      ))}
    </ul>
  );
}
```

**꼬리질문**

- AbortController를 사용하는 방법은?
- cleanup 함수에서 flag를 사용하는 방법은?

---

### useEffect와 useLayoutEffect의 실행 시점

**면접 질문**

- 두 Hook의 실행 시점 차이와 각각 언제 사용하나요?

**꼬리질문**

- DOM 측정이 필요할 때 왜 `useLayoutEffect`를 써야 하나요?
- SSR에서 `useLayoutEffect` 경고가 나는 이유는?

---

### useCallback을 남용하면 안 되는 이유

**면접 질문**

- 모든 함수에 `useCallback`을 쓰면 좋은 거 아닌가요?

**꼬리질문**

- `useCallback`이 실제로 도움이 되는 경우는?
- `useMemo`와의 차이는?

---

### setState의 배치 업데이트 이해하기

**면접 질문**

- 버튼을 클릭하면 count는 얼마가 되나요?

```jsx
const [count, setCount] = useState(0);
function handleClick() {
  setCount(count + 1);
  setCount(count + 1);
  setCount(count + 1);
}
```

**꼬리질문**

- 3을 만들려면 어떻게 해야 하나요?
- React 18에서 배치 업데이트가 어떻게 바뀌었나요?

---

### Context API의 리렌더링 문제

**면접 질문**

- Context를 전역 상태 관리에만 쓰면 안 되는 이유는?

**꼬리질문**

- Context의 리렌더링을 최적화하는 방법은?
- 언제 Context가 적합한가요?

---

### Redux vs Zustand vs Jotai 선택 기준

**면접 질문**

- 각각의 특징과 언제 사용하면 좋은지 설명해주세요.

**꼬리질문**

- Redux Toolkit이 기존 Redux 대비 개선된 점은?
- Atom 기반 상태 관리의 장점은?

---

### 서버 상태와 클라이언트 상태를 분리하는 이유

**면접 질문**

- React Query가 해결하는 문제는 무엇인가요?

**꼬리질문**

- stale-while-revalidate 패턴이란?
- 캐시 무효화는 어떻게 하나요?

---

### React Server Components가 SSR과 다른 점

**면접 질문**

- RSC에서 `useState`를 쓸 수 없는 이유는?

**꼬리질문**

- 클라이언트 컴포넌트와 서버 컴포넌트의 경계는?
- RSC의 번들 사이즈 이점은?

---

### use Hook이 기존 Hook과 다른 점

**면접 질문**

- `use`가 if문 안에서도 사용 가능한 이유는?

**꼬리질문**

- Promise를 직접 읽는 방식의 장점은?
- Suspense와의 관계는?

---

### React Compiler가 해결하는 문제

**면접 질문**

- 수동으로 `useMemo`, `useCallback`을 쓰지 않아도 되는 이유는?

**꼬리질문**

- 기존 코드와의 호환성은?
- 어떤 최적화가 자동으로 적용되나요?

---

## 4. Next.js

### SSR, SSG, ISR, CSR 한 문장 정리

**면접 질문**

- 각각 한 문장으로 설명하고, 블로그에는 뭘 쓸 건가요?

**꼬리질문**

- TTFB, FCP, LCP 관점에서 비교하면?
- Streaming SSR이란?

---

### App Router의 기본이 서버 컴포넌트인 이유

**면접 질문**

- 클라이언트 컴포넌트로 바꾸려면 어떻게 하나요?

**꼬리질문**

- 서버 컴포넌트에서 클라이언트 컴포넌트로 props 전달 시 제한은?
- `'use client'`의 정확한 의미는?

---

### Next.js의 4가지 캐싱 레이어

**면접 질문**

- 4가지를 말하고 각각 어떻게 무효화하나요?

**꼬리질문**

- `revalidatePath`와 `revalidateTag`의 차이는?
- `fetch`의 `cache` 옵션들은?

---

### Partial Prerendering이 나온 이유

**면접 질문**

- PPR이 해결하는 문제는 무엇인가요?

**꼬리질문**

- 정적 부분과 동적 부분은 어떻게 나누나요?
- Suspense와의 관계는?

---

## 5. CSS

### Flexbox와 Grid 선택 기준

**면접 질문**

- 각각 언제 사용하나요? 실제 예시를 들어주세요.

**꼬리질문**

- 1차원 vs 2차원 레이아웃이란?
- 둘을 함께 사용하는 경우는?

---

### auto-fill과 auto-fit의 차이

**면접 질문**

- 아래 두 코드의 차이를 설명해주세요.

```css
grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
```

---

### Container Queries가 미디어 쿼리보다 좋은 경우

**면접 질문**

- 구체적인 예시와 함께 설명해주세요.

**꼬리질문**

- 컴포넌트 기반 개발에서 왜 유용한가요?

---

### :has() 선택자로 부모 스타일링하기

**면접 질문**

- 체크된 체크박스를 가진 label의 스타일을 바꾸려면?

**꼬리질문**

- `:has()`가 나오기 전에는 어떻게 했나요?
- 성능 고려사항은?

---

### CSS-in-JS가 RSC에서 문제가 되는 이유

**면접 질문**

- styled-components 같은 라이브러리의 문제점과 대안은?

**꼬리질문**

- Zero-runtime CSS-in-JS란?
- Tailwind가 RSC와 잘 맞는 이유는?

---

## 6. 웹 성능

### Core Web Vitals 3가지와 목표 수치

**면접 질문**

- LCP, INP, CLS 각각의 정의와 목표치를 말해주세요.

**꼬리질문**

- FID가 INP로 바뀐 이유는?
- 측정 도구는 뭘 쓰나요?

---

### LCP를 개선하는 방법들

**면접 질문**

- 3가지 이상 말해주세요.

**꼬리질문**

- LCP 요소는 어떻게 결정되나요?
- `<link rel="preload">`는 언제 사용하나요?

---

### CLS가 발생하는 원인과 해결법

**면접 질문**

- 원인 3가지와 각각의 해결법은?

**꼬리질문**

- 이미지에 width/height를 지정해야 하는 이유는?
- 웹폰트로 인한 CLS를 막으려면?

---

### Tree Shaking이 동작하지 않는 경우

**면접 질문**

- Tree Shaking 실패의 원인과 확인 방법은?

**꼬리질문**

- side effects란?
- `sideEffects: false`는 언제 사용하나요?

---

### React.lazy와 코드 스플리팅

**면접 질문**

- 코드 스플리팅이 필요한 이유와 구현 방법은?

**꼬리질문**

- `Suspense`의 역할은?
- 라우트 기반 스플리팅 vs 컴포넌트 기반 스플리팅?

---

### transform이 left/top보다 빠른 이유

**면접 질문**

- Reflow(Layout)가 발생하는 속성과 발생하지 않는 속성은?

**꼬리질문**

- Composite만 발생하는 속성은?
- `will-change`의 주의점은?

---

## 7. 웹 보안

### React에서 XSS가 발생할 수 있는 경우

**면접 질문**

- XSS 공격 3가지 유형과 React에서의 취약점은?

**꼬리질문**

- `dangerouslySetInnerHTML`을 안전하게 쓰려면?
- CSP 헤더의 역할은?

---

### CSRF 공격을 막는 방법 3가지

**면접 질문**

- SPA에서 CSRF 토큰은 어떻게 관리하나요?

**꼬리질문**

- `SameSite` 쿠키 속성의 옵션들은?
- REST API에서 CSRF가 문제가 되는 경우는?

---

### Preflight 요청이 발생하는 조건

**면접 질문**

- Simple Request의 조건과 Preflight가 필요한 이유는?

**꼬리질문**

- `Access-Control-Allow-Origin: *`의 문제점은?
- Credentials 모드에서의 제한은?

---

## 8. 브라우저 & 네트워크

### URL 입력부터 화면 렌더링까지

**면접 질문**

- 전체 과정을 7단계 이상으로 설명해주세요.

**꼬리질문**

- DNS 캐싱 레벨들은?
- TCP vs UDP의 차이는?

---

### async와 defer 스크립트의 차이

**면접 질문**

- 각각의 로딩/실행 시점과 언제 사용하나요?

**꼬리질문**

- 모듈 스크립트(`type="module"`)의 기본 동작은?
- DOMContentLoaded와의 관계는?

---

### HTTP/2가 HTTP/1.1보다 빠른 이유

**면접 질문**

- 3가지 이상 말해주세요.

**꼬리질문**

- 도메인 샤딩이 HTTP/2에서 불필요한 이유는?
- HTTP/3(QUIC)이 필요한 이유는?

---

### JWT 토큰은 어디에 저장해야 하나

**면접 질문**

- Cookie, LocalStorage, SessionStorage, IndexedDB 각각의 특징과 JWT 저장 위치
  권장안은?

**꼬리질문**

- `HttpOnly` 쿠키의 장점은?
- XSS와 CSRF 관점에서 비교하면?

---

## 9. 프론트엔드 시스템 디자인

### 무한 스크롤 구현 전략

**면접 질문**

- 어떻게 구현하시겠어요?

**꼬리질문**

- 10만 개 아이템이면 어떻게 최적화하나요?
- Intersection Observer vs scroll event?
- 가상 스크롤(Virtualization)이란?

---

### 자동완성 검색창 설계

**면접 질문**

- 디바운싱과 쓰로틀링 중 뭘 쓰나요? 차이는?

**꼬리질문**

- 캐싱은 어떻게 하나요?
- 키보드 네비게이션은?
- 접근성 고려사항은?

---

### 실시간 채팅 구현 방법 비교

**면접 질문**

- WebSocket vs SSE vs Long Polling 중 뭘 쓰나요?

**꼬리질문**

- 연결이 끊어지면 어떻게 처리하나요?
- 메시지 순서 보장은?
- 오프라인 지원은?

---

### 이미지 갤러리 성능 최적화

**면접 질문**

- 인스타그램 같은 갤러리를 어떻게 설계하나요?

**꼬리질문**

- Lazy loading 구현 방법은?
- 이미지 포맷 선택 기준은?
- placeholder 전략은?

---

## 10. 테스팅

### E2E 테스트를 적게 쓰는 이유

**면접 질문**

- 테스트 피라미드에서 왜 E2E는 적게, 유닛은 많이 쓰나요?

**꼬리질문**

- 각 레벨의 장단점은?
- ROI가 가장 좋은 테스트는?

---

### getByRole을 getByTestId보다 권장하는 이유

**면접 질문**

- React Testing Library의 쿼리 우선순위와 그 이유는?

**꼬리질문**

- 접근성과 테스트의 관계는?
- `getBy`, `queryBy`, `findBy`의 차이는?

---

### 컴포넌트 내부 상태를 테스트해야 하나

**면접 질문**

- useState의 값을 직접 검증해야 하나요?

**꼬리질문**

- "구현이 아닌 동작을 테스트하라"는 의미는?
- 사용자 관점의 테스트란?

---

### Cypress vs Playwright 선택 기준

**면접 질문**

- 각각의 장단점과 언제 사용하나요?

**꼬리질문**

- 크로스 브라우저 테스트는?
- CI/CD 통합 시 고려사항은?

---

### Flaky Test를 줄이는 방법

**면접 질문**

- 불안정한 테스트의 원인과 해결법은?

**꼬리질문**

- 타이밍 문제 해결법은?
- 테스트 격리(isolation)란?

---

## 보너스: 라이브 코딩

### 자주 나오는 구현 문제

```javascript
// debounce 구현
const debouncedFn = debounce(fn, 300);

// throttle 구현
const throttledFn = throttle(fn, 300);

// deep clone 구현
deepClone({ a: { b: 1 } });

// flatten 구현
flatten([1, [2, [3, [4]]]], 2); // [1, 2, 3, [4]]

// get 함수 구현
get({ a: { b: { c: 1 } } }, "a.b.c"); // 1
```

### React 훅 구현

```jsx
// useDebounce
const debouncedValue = useDebounce(value, 500);

// usePrevious
const prevValue = usePrevious(value);

// useIntersectionObserver
const { ref, isIntersecting } = useIntersectionObserver();

// useLocalStorage
const [value, setValue] = useLocalStorage("key", initialValue);
```

### TypeScript 타입 챌린지

```typescript
// First<T>
type A = First<[1, 2, 3]>; // 1

// Last<T>
type B = Last<[1, 2, 3]>; // 3

// Flatten<T>
type C = Flatten<[1, [2, [3]]]>; // [1, 2, 3]

// DeepPartial<T>
type D = DeepPartial<{ a: { b: string } }>;
```

---

## 공부 우선순위

### 1순위 (필수)

- 이벤트 루프 & 비동기
- 클로저
- React 렌더링 & Hooks
- TypeScript 제네릭
- Core Web Vitals

### 2순위 (차별화)

- React Server Components
- 조건부 타입 & infer
- 시스템 디자인
- Next.js 캐싱

### 3순위 (심화)

- TypeScript Variance
- 브라우저 렌더링 파이프라인
- 프론트엔드 아키텍처

---

## 참고 자료

- [Frontend Interview Handbook](https://www.frontendinterviewhandbook.com/)
- [GreatFrontEnd](https://www.greatfrontend.com/)
- [Type Challenges](https://github.com/type-challenges/type-challenges)
- [프론트엔드 기술 면접 (한국어)](https://github.com/junh0328/prepare_frontend_interview)

---

_마지막 업데이트: 2026년 2월_
