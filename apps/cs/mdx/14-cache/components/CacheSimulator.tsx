import { MemoryHierarchy } from "./MemoryHierarchy";

// 캐시 한 층짜리 MemoryHierarchy — 캐시 개념 도입용 단순 버전
export function CacheSimulator() {
  return (
    <MemoryHierarchy
      levels={[
        { name: "캐시", capacity: 4 },
        { name: "RAM", capacity: 8 },
      ]}
      addressCount={8}
    />
  );
}
