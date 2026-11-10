import { useImperativeHandle, useRef, type Ref } from 'react';
import { View } from 'react-native';

import type { MediaAsset } from '@/core/media/types';

import type { SwipeDirection } from '../store/swipeStore';
import { SwipeCard, type SwipeCardHandle } from './SwipeCard';

/** Never render more than this many cards at once. */
export const VISIBLE_CARDS = 3;

export type SwipeDeckHandle = SwipeCardHandle;

type SwipeDeckProps = {
  assets: MediaAsset[];
  onSwiped: (asset: MediaAsset, direction: SwipeDirection) => void;
  ref?: Ref<SwipeDeckHandle>;
};

export function SwipeDeck({ assets, onSwiped, ref }: SwipeDeckProps) {
  const topCard = useRef<SwipeCardHandle>(null);

  // The buttons animate the top card exactly like a swipe would.
  useImperativeHandle(ref, () => ({
    swipe: (direction) => topCard.current?.swipe(direction),
  }));

  const visible = assets.slice(0, VISIBLE_CARDS);

  return (
    <View className="flex-1">
      {/* Rendered bottom-up so the top card is drawn last. Keys are asset ids,
          so a card keeps its own animation state as it moves up the stack. */}
      {visible
        .map((asset, depth) => (
          <SwipeCard
            key={asset.id}
            ref={depth === 0 ? topCard : undefined}
            asset={asset}
            depth={depth}
            onSwiped={onSwiped}
          />
        ))
        .reverse()}
    </View>
  );
}
