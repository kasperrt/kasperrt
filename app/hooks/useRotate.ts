import { type RefObject, useCallback, useEffect } from 'react';
import { hasTouchSupport } from '~/utils/touch';

interface Props {
  elements: {
    multiplier?: number;
    shadow?: {
      multiplier: number;
    };
    ref: RefObject<HTMLElement | null>;
  }[];
}

export function useRotate({ elements }: Props) {
  const rotate = useCallback(
    (element: HTMLElement, left: number, top: number, shadow?: Props['elements'][number]['shadow']) => {
      element.style.transform = `translate(${left}px, ${top}px)`;

      if (!shadow) {
        return;
      }
      element.style.boxShadow = `${left * shadow.multiplier}px ${top * shadow.multiplier}px #8d8d8d`;
    },
    [],
  );

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!document) {
        return;
      }

      for (const element of elements) {
        if (!element.ref.current) {
          continue;
        }
        const curr = element.ref.current;
        const multiplier = element.multiplier ?? 1;
        const left = (e.clientX / document.documentElement.clientWidth - 0.5) * multiplier;
        const top = (e.clientY / document.documentElement.clientHeight - 0.5) * multiplier;
        rotate(curr, left, top, element.shadow);
      }
    },
    [elements, rotate],
  );

  const onDeviceOrientation = useCallback(
    (event: DeviceOrientationEvent) => {
      if (!event || !event.beta || !event.gamma) {
        return;
      }

      const x = Math.round(event.gamma * 10) / 10;
      const y = Math.round(event.beta * 10) / 10;

      const movement = 0.5;

      for (const element of elements) {
        if (!element.ref.current) {
          continue;
        }
        const curr = element.ref.current;
        const multiplier = element.multiplier ?? 1;
        const left = -(x / 10) * movement * multiplier;
        const top = (y / 10) * movement * multiplier;

        rotate(curr, -(left - 0.5), -(top - 0.5), element.shadow);
      }
    },
    [elements, rotate],
  );

  useEffect(() => {
    if (!elements?.length) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    if (hasTouchSupport()) {
      return;
    }

    window.addEventListener('deviceorientation', onDeviceOrientation, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    return () => {
      window.removeEventListener('deviceorientation', onDeviceOrientation);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [elements.length, onDeviceOrientation, onMouseMove]);
}
