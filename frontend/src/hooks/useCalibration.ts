// frontend/src/hooks/useCalibration.ts
import { useState, useCallback } from 'react';
import { useProjectStore } from '../stores/projectStore';

interface CalibrationPoint {
  x: number;
  y: number;
}

type CalibrationStep = 'idle' | 'point1' | 'point2' | 'distance' | 'done';

export function useCalibration() {
  const setCalibration = useProjectStore((s) => s.setCalibration);
  const [step, setStep] = useState<CalibrationStep>('idle');
  const [point1, setPoint1] = useState<CalibrationPoint | null>(null);
  const [point2, setPoint2] = useState<CalibrationPoint | null>(null);

  const start = useCallback(() => {
    setStep('point1');
    setPoint1(null);
    setPoint2(null);
  }, []);

  const onCanvasClick = useCallback(
    (pt: CalibrationPoint) => {
      if (step === 'point1') {
        setPoint1(pt);
        setStep('point2');
      } else if (step === 'point2') {
        setPoint2(pt);
        setStep('distance');
      }
    },
    [step],
  );

  const confirm = useCallback(
    (realDistanceCm: number) => {
      if (!point1 || !point2) return;

      const distancePx = Math.sqrt(
        (point2.x - point1.x) ** 2 + (point2.y - point1.y) ** 2,
      );
      const pixelsPerCm = distancePx / realDistanceCm;

      setCalibration({
        point1,
        point2,
        realDistanceCm,
        pixelsPerCm,
      });
      setStep('done');
    },
    [point1, point2, setCalibration],
  );

  const reset = useCallback(() => {
    setStep('idle');
    setPoint1(null);
    setPoint2(null);
  }, []);

  return { step, point1, point2, start, onCanvasClick, confirm, reset };
}
