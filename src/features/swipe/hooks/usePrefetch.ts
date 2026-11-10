import { Image } from 'expo-image';
import { useEffect } from 'react';

import type { MediaAsset } from '@/core/media/types';

import { VISIBLE_CARDS } from '../components/SwipeDeck';

const PREFETCH_COUNT = 4;

/** Warms the image cache for the cards just below the rendered stack. */
export function usePrefetch(queue: MediaAsset[]) {
  const upcoming = queue.slice(VISIBLE_CARDS, VISIBLE_CARDS + PREFETCH_COUNT);
  const key = upcoming.map((a) => a.id).join('|');

  useEffect(() => {
    if (upcoming.length === 0) return;
    Image.prefetch(
      upcoming.map((a) => a.uri),
      'memory-disk',
    ).catch(() => {
      // A failed prefetch only means the image loads when its card renders.
    });
    // `key` captures exactly which assets are upcoming.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
