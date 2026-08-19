import { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Rolls a number up to its value on mount and on change.
 *
 * This is the one place the UI spends motion on data rather than on layout,
 * and it is the "premium" beat of the Today screen: the rate counts up into
 * place, so the eye is drawn to the figure that the whole screen exists to
 * deliver.
 *
 * ~30 lines of rAF instead of an animation dependency. It settles on the exact
 * target value rather than the last interpolated frame, so the final number is
 * never off by a rounding error, and it returns the target immediately when
 * reduced motion is requested.
 */
export const useCountUp = (target, duration = 700) => {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  const frameRef = useRef(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target);
      return undefined;
    }

    const from = 0;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      // Matches --ease-settle: quick start, soft landing.
      const eased = 1 - Math.pow(1 - progress, 3);

      if (progress >= 1) {
        setValue(target); // exact, not the last interpolated frame
        return;
      }

      setValue(from + (target - from) * eased);
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return value;
};

export default useCountUp;
