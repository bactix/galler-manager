import { Image } from 'expo-image';
import { useCallback, useEffect, useImperativeHandle, useMemo, type Ref } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  FadeIn,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { MediaAsset } from '@/core/media/types';

import type { SwipeDirection } from '../store/swipeStore';

/** Fraction of the screen width a card must travel to count as a swipe. */
const SWIPE_THRESHOLD = 0.3;
/** A flick faster than this (points/s) swipes even below the distance threshold. */
const FLICK_VELOCITY = 800;
const MAX_ROTATION_DEG = 12;

export type SwipeCardHandle = {
  swipe: (direction: SwipeDirection) => void;
};

type SwipeCardProps = {
  asset: MediaAsset;
  /** Position in the stack: 0 is the top, interactive card. */
  depth: number;
  onSwiped: (asset: MediaAsset, direction: SwipeDirection) => void;
  ref?: Ref<SwipeCardHandle>;
};

/**
 * One photo in the deck. All drag state lives in shared values on the UI
 * thread; React only hears about the card once the swipe animation finishes.
 */
export function SwipeCard({ asset, depth, onSwiped, ref }: SwipeCardProps) {
  const { width } = useWindowDimensions();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const leaving = useSharedValue(false);
  const stackDepth = useSharedValue(depth);

  useEffect(() => {
    stackDepth.value = withTiming(depth, { duration: 180 });
  }, [depth, stackDepth]);

  const finish = useCallback(
    (direction: SwipeDirection) => onSwiped(asset, direction),
    [asset, onSwiped],
  );

  const flyOut = useCallback(
    (direction: SwipeDirection) => {
      'worklet';
      leaving.value = true;
      const target = (direction === 'right' ? 1 : -1) * width * 1.5;
      translateX.value = withTiming(target, { duration: 220 }, (finished) => {
        if (finished) scheduleOnRN(finish, direction);
      });
    },
    [finish, leaving, translateX, width],
  );

  useImperativeHandle(
    ref,
    () => ({
      swipe(direction) {
        if (!leaving.value) flyOut(direction);
      },
    }),
    [flyOut, leaving],
  );

  const panConfig = useMemo(
    () => ({
      enabled: depth === 0,
      onUpdate: (event: { translationX: number; translationY: number }) => {
        'worklet';
        if (leaving.value) return;
        translateX.value = event.translationX;
        translateY.value = event.translationY;
      },
      onDeactivate: (event: { velocityX: number }) => {
        'worklet';
        if (leaving.value) return;
        const threshold = width * SWIPE_THRESHOLD;
        if (translateX.value > threshold || event.velocityX > FLICK_VELOCITY) {
          flyOut('right');
        } else if (translateX.value < -threshold || event.velocityX < -FLICK_VELOCITY) {
          flyOut('left');
        } else {
          translateX.value = withSpring(0);
          translateY.value = withSpring(0);
        }
      },
    }),
    [depth, flyOut, leaving, translateX, translateY, width],
  );
  const pan = usePanGesture(panConfig);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value + stackDepth.value * 14 },
      { scale: 1 - stackDepth.value * 0.05 },
      {
        rotate: `${interpolate(translateX.value, [-width, 0, width], [-MAX_ROTATION_DEG, 0, MAX_ROTATION_DEG])}deg`,
      },
    ],
  }));

  const keepLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, width * 0.25], [0, 1], Extrapolation.CLAMP),
  }));

  const deleteLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-width * 0.25, 0], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View entering={FadeIn.duration(200)} style={[StyleSheet.absoluteFill, cardStyle]}>
        <View className="flex-1 overflow-hidden rounded-3xl border border-border bg-surface shadow-lg">
          <Image
            source={{ uri: asset.uri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={asset.id}
            priority={depth === 0 ? 'high' : 'normal'}
            transition={120}
            accessibilityIgnoresInvertColors
          />
          <Animated.View style={[styles.labelLeft, keepLabelStyle]}>
            <Text className="rounded-lg border-4 border-keep px-3 py-1 text-3xl font-extrabold text-keep">
              KEEP
            </Text>
          </Animated.View>
          <Animated.View style={[styles.labelRight, deleteLabelStyle]}>
            <Text className="rounded-lg border-4 border-danger px-3 py-1 text-3xl font-extrabold text-danger">
              DELETE
            </Text>
          </Animated.View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  labelLeft: { position: 'absolute', top: 32, left: 24, transform: [{ rotate: '-15deg' }] },
  labelRight: { position: 'absolute', top: 32, right: 24, transform: [{ rotate: '15deg' }] },
});
