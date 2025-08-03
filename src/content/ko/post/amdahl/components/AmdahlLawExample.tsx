"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useTranslations } from "@/i18n/utils";

const AmdahlLawExample = ({ lang }: { lang: string }) => {
  const t = useTranslations(lang)("AmdahlLawExample");
  const [proportion, setProportion] = useState(40); // P as a percentage
  const [speedup, setSpeedup] = useState(2); // S

  const overallSpeedup = useMemo(() => {
    const p = proportion / 100;
    if (p === 1 && speedup > 0) return speedup;
    if (speedup <= 0) return 1;
    return 1 / (1 - p + p / speedup);
  }, [proportion, speedup]);

  const maxSpeedup = useMemo(() => {
    const p = proportion / 100;
    if (p === 1) return Infinity;
    return 1 / (1 - p);
  }, [proportion]);

  return (
    <Card>
      <CardContent>
        <p
          dangerouslySetInnerHTML={{
            __html: t.description({
              proportion: `${proportion}%`,
              speedup: `${speedup.toFixed(1)}`,
              overallSpeedup: `${overallSpeedup.toFixed(2)}`,
              maxSpeedup: `${maxSpeedup === Infinity ? t.infinity : maxSpeedup.toFixed(2)}`,
            }),
          }}
        />

        <div className="space-y-7 pt-7">
          <div>
            <Label htmlFor="proportion-slider">
              {t.proportionLabel(proportion)}
            </Label>
            <Slider
              id="proportion-slider"
              value={[proportion]}
              onValueChange={(val) => setProportion(val[0])}
              max={100}
              step={1}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="speedup-slider">{t.speedupLabel(speedup)}</Label>
            <Slider
              id="speedup-slider"
              value={[speedup]}
              onValueChange={(val) => setSpeedup(val[0])}
              min={1}
              max={100}
              step={0.1}
              className="mt-2"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AmdahlLawExample;
