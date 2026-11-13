import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

interface UseLazyRenderListOptions {
  initialCount?: number;
  batchSize?: number;
  resetKey?: string;
}

/**
 * Progressive lazy-rendering hook for long lists (Jobs & Community Feed).
 * Keeps initial mobile render lightweight and appends items smoothly on scroll
 * via IntersectionObserver, with a manual loadMore fallback.
 */
export function useLazyRenderList<T>(
  items: T[],
  {
    initialCount = 10,
    batchSize = 10,
    resetKey = ''
  }: UseLazyRenderListOptions = {}
) {
  const [visibleCount, setVisibleCount] = useState<number>(initialCount);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleCount(initialCount);
  }, [resetKey, initialCount]);

  const totalCount = items.length;
  const hasMore = visibleCount < totalCount;
  const remainingCount = Math.max(0, totalCount - visibleCount);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(totalCount, prev + batchSize));
  }, [totalCount, batchSize]);

  useEffect(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((prev) => Math.min(totalCount, prev + batchSize));
        }
      },
      {
        root: null,
        rootMargin: '420px 0px',
        threshold: 0.01
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, totalCount, batchSize]);

  const visibleItems = useMemo(
    () => items.slice(0, visibleCount),
    [items, visibleCount]
  );

  return {
    visibleItems,
    visibleCount,
    totalCount,
    hasMore,
    remainingCount,
    loadMore,
    sentinelRef
  };
}
