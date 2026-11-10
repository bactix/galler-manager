import { useRef } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePhotoPermission, type PhotoPermission } from '@/core/permissions';
import { Button, MessageView } from '@/shared/ui';

import { useDeckLifecycle } from '../hooks/useDeckLifecycle';
import { usePrefetch } from '../hooks/usePrefetch';
import { useSwipeStore } from '../store/swipeStore';
import { DeckActions } from './DeckActions';
import { SwipeDeck, type SwipeDeckHandle } from './SwipeDeck';

function PermissionPrompt({ permission, request, openSettings }: PhotoPermission) {
  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  // Denied for good: only the OS settings can change it now.
  if (permission.status === 'denied' && !permission.canAskAgain) {
    return (
      <MessageView
        title="Photo access is off"
        body="SwipeClean needs access to your photos to show them for review. Nothing leaves your device. Turn on photo access in Settings to continue."
      >
        <Button label="Open Settings" onPress={openSettings} />
      </MessageView>
    );
  }

  return (
    <MessageView
      title="Clean up your gallery"
      body="Swipe right to keep a photo and left to mark it for deletion. Everything stays on your device, and nothing is deleted until you confirm in Trash."
    >
      <Button label="Allow photo access" onPress={request} />
    </MessageView>
  );
}

function LimitedAccessBanner({ onManage }: { onManage: () => void }) {
  return (
    <View className="mx-4 mb-2 flex-row items-center justify-between rounded-xl bg-surface px-4 py-3">
      <Text className="flex-1 pr-3 text-sm text-muted">
        You've shared only some photos with SwipeClean.
      </Text>
      <Pressable accessibilityRole="button" onPress={onManage} hitSlop={8}>
        <Text className="text-sm font-semibold text-primary">Manage</Text>
      </Pressable>
    </View>
  );
}

export function SwipeScreen() {
  const photoPermission = usePhotoPermission();
  const { permission, manageLimitedAccess } = photoPermission;
  const canRead = permission?.status === 'granted' || permission?.status === 'limited';

  useDeckLifecycle(canRead);

  const queue = useSwipeStore((s) => s.queue);
  const status = useSwipeStore((s) => s.status);
  const hasMore = useSwipeStore((s) => s.hasMore);
  const stagedCount = useSwipeStore((s) => s.stagedCount);
  const canUndo = useSwipeStore((s) => s.canUndo);
  const error = useSwipeStore((s) => s.error);
  const swiped = useSwipeStore((s) => s.swiped);
  const undo = useSwipeStore((s) => s.undo);

  const deck = useRef<SwipeDeckHandle>(null);
  usePrefetch(queue);

  const loading = status === 'idle' || status === 'loading' || (queue.length === 0 && hasMore);
  const reviewedAll = !loading && queue.length === 0 && status !== 'error';

  let body;
  if (!canRead) {
    body = <PermissionPrompt {...photoPermission} />;
  } else if (status === 'error' && queue.length === 0) {
    body = <MessageView title="Couldn't load photos" body={error ?? undefined} />;
  } else if (reviewedAll) {
    body = (
      <MessageView
        title="All caught up"
        body={
          stagedCount > 0
            ? `You've reviewed every photo. ${stagedCount} ${stagedCount === 1 ? 'photo is' : 'photos are'} waiting in Trash.`
            : "You've reviewed every photo in your library."
        }
      />
    );
  } else if (loading && queue.length === 0) {
    body = (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  } else {
    body = (
      <View className="flex-1 px-4 pt-2">
        <SwipeDeck ref={deck} assets={queue} onSwiped={swiped} />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between px-5 pb-3 pt-2">
        <Text className="text-2xl font-extrabold text-foreground">SwipeClean</Text>
        {canRead && stagedCount > 0 ? (
          <Text className="text-sm font-semibold text-danger">{stagedCount} to delete</Text>
        ) : null}
      </View>

      {permission?.status === 'limited' ? <LimitedAccessBanner onManage={manageLimitedAccess} /> : null}

      {body}

      {canRead ? (
        <DeckActions
          canSwipe={queue.length > 0}
          canUndo={canUndo}
          onDelete={() => deck.current?.swipe('left')}
          onKeep={() => deck.current?.swipe('right')}
          onUndo={undo}
        />
      ) : null}
    </SafeAreaView>
  );
}
