import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Measure() {
  const [dateNowResults, setDateNowResults] = useState<number[]>([]);
  const [performanceNowResults, setPerformanceNowResults] = useState<number[]>(
    [],
  );

  const measurePrecision = () => {
    const dateResults: number[] = [];
    const perfResults: number[] = [];

    // 짧은 시간 안에 여러 번 호출하여 정밀도 차이 확인
    for (let i = 0; i < 100; i++) {
      dateResults.push(Date.now());
      perfResults.push(performance.now());
    }

    setDateNowResults(dateResults);
    setPerformanceNowResults(perfResults);
  };

  const handleClear = () => {
    setDateNowResults([]);
    setPerformanceNowResults([]);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap gap-2">
          <Button onClick={measurePrecision}>정밀도 측정</Button>
          <Button onClick={handleClear} variant="outline">
            초기화
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Date.now()</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="mt-2 max-h-48 overflow-y-auto">
              {dateNowResults.map((result, i) => (
                <li key={i}>{result}ms</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>performance.now()</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="mt-2 max-h-48 overflow-y-auto">
              {performanceNowResults.map((result, i) => (
                <li key={i}>{result.toFixed(4)}ms</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
