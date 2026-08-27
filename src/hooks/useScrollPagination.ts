import { useEffect, useRef, useState } from "react";

/**
 * Reveals `items` in batches of `pageSize`, growing the batch whenever a
 * sentinel element at the end of the visible list scrolls into view inside
 * its scroll container.
 *
 * Attach `containerRef` to the scrollable element and `sentinelRef` to an
 * empty marker rendered after the last visible row (only while `hasMore` is
 * true).
 */
export function useScrollPagination<T>(items: T[], pageSize = 10) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // A new/reloaded list starts back at one page rather than keeping however
  // far a previous list had been scrolled.
  useEffect(() => {
    setVisibleCount(pageSize);
  }, [items, pageSize]);

  useEffect(() => {
    const root = containerRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((count) => Math.min(count + pageSize, items.length));
        }
      },
      { root, threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [items.length, pageSize, visibleCount]);

  return {
    visibleItems: items.slice(0, visibleCount),
    hasMore: visibleCount < items.length,
    containerRef,
    sentinelRef,
  };
}
