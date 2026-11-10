import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';

import { getMediaRepository } from '@/core/media';
import { useSetting } from '@/core/storage';

import { useSwipeStore } from '../store/swipeStore';

/**
 * Loads the deck once photo access is available, reloads it when the review
 * order changes, and catches up on changes made elsewhere when the screen
 * regains focus.
 */
export function useDeckLifecycle(canReadLibrary: boolean) {
  const [reviewOrder] = useSetting('reviewOrder');
  const start = useSwipeStore((s) => s.start);
  const refreshIfStale = useSwipeStore((s) => s.refreshIfStale);

  useEffect(() => {
    if (canReadLibrary) start(reviewOrder);
  }, [canReadLibrary, reviewOrder, start]);

  useFocusEffect(
    useCallback(() => {
      if (canReadLibrary) refreshIfStale();
    }, [canReadLibrary, refreshIfStale]),
  );

  // When the deck is empty, pick up photos added to the library (or newly shared
  // under limited access) right away. Otherwise reloading would interrupt a swipe.
  useEffect(() => {
    if (!canReadLibrary) return;
    return getMediaRepository().addChangeListener(() => {
      const { queue, status } = useSwipeStore.getState();
      if (queue.length === 0 && status !== 'loading') start(reviewOrder);
    });
  }, [canReadLibrary, reviewOrder, start]);
}
