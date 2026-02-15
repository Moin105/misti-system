import { useState, useEffect, useRef, RefObject } from "react";

interface UseLazyLoadOptions {
  rootMargin?: string;
  threshold?: number;
}

interface UseLazyLoadReturn {
  ref: RefObject<HTMLDivElement>;
  isVisible: boolean;
}

/**
 * Hook for lazy-loading below-the-fold content using IntersectionObserver.
 * Content only renders when it comes into view (or near view based on rootMargin).
 */
export const useLazyLoad = (options: UseLazyLoadOptions = {}): UseLazyLoadReturn => {
  const { rootMargin = "200px", threshold = 0 } = options;
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || isVisible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [rootMargin, threshold, isVisible]);

  return { ref, isVisible };
};

export default useLazyLoad;
