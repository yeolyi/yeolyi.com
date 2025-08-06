import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Compare() {
  const [timeoutDelays, setTimeoutDelays] = useState<number[]>([]);
  const [messageChannelDelays, setMessageChannelDelays] = useState<number[]>(
    [],
  );
  const [microtaskDelays, setMicrotaskDelays] = useState<number[]>([]);

  const measureSetTimeout = () => {
    const start = performance.now();
    setTimeout(() => {
      const end = performance.now();
      setTimeoutDelays((prev) => [...prev, end - start]);
    }, 0);
  };

  const measureMessageChannel = () => {
    const channel = new MessageChannel();
    const start = performance.now();
    channel.port1.onmessage = () => {
      const end = performance.now();
      setMessageChannelDelays((prev) => [...prev, end - start]);
    };
    channel.port2.postMessage(null);
  };

  const measureQueueMicrotask = () => {
    const start = performance.now();
    queueMicrotask(() => {
      const end = performance.now();
      setMicrotaskDelays((prev) => [...prev, end - start]);
    });
  };

  const calculateAverage = (delays: number[]) => {
    if (delays.length === 0) return 0;
    const sum = delays.reduce((a, b) => a + b, 0);
    return (sum / delays.length).toFixed(4);
  };

  const handleClear = () => {
    setTimeoutDelays([]);
    setMessageChannelDelays([]);
    setMicrotaskDelays([]);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap gap-2">
          <Button onClick={measureSetTimeout}>setTimeout 측정</Button>
          <Button onClick={measureMessageChannel}>MessageChannel 측정</Button>
          <Button onClick={measureQueueMicrotask}>queueMicrotask 측정</Button>
          <Button onClick={handleClear} variant="outline">
            초기화
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>setTimeout(fn, 0)</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              평균 딜레이: <strong>{calculateAverage(timeoutDelays)}ms</strong>
            </p>
            <ul className="mt-2 max-h-48 overflow-y-auto">
              {timeoutDelays.map((delay, i) => (
                <li key={i}>{delay.toFixed(4)}ms</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>MessageChannel</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              평균 딜레이:{" "}
              <strong>{calculateAverage(messageChannelDelays)}ms</strong>
            </p>
            <ul className="mt-2 max-h-48 overflow-y-auto">
              {messageChannelDelays.map((delay, i) => (
                <li key={i}>{delay.toFixed(4)}ms</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>queueMicrotask</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              평균 딜레이:{" "}
              <strong>{calculateAverage(microtaskDelays)}ms</strong>
            </p>
            <ul className="mt-2 max-h-48 overflow-y-auto">
              {microtaskDelays.map((delay, i) => (
                <li key={i}>{delay.toFixed(4)}ms</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
