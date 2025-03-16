import { type RefObject, useCallback, useEffect } from 'react';

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
        curr.style.transform = `translate(${left}px, ${top}px)`;

        if (!element.shadow) {
          continue;
        }
        curr.style.boxShadow = `${left * element.shadow.multiplier}px ${top * element.shadow.multiplier}px #8d8d8d`;
      }
    },
    [elements],
  );

  useEffect(() => {
    if (!elements?.length) {
      return;
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [elements.length, onMouseMove]);
}
