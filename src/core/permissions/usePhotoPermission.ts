import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';

import { getMediaRepository } from '@/core/media';
import type { MediaPermission } from '@/core/media/types';

export type PhotoPermission = {
  /** null until the first check finishes. */
  permission: MediaPermission | null;
  request: () => Promise<void>;
  openSettings: () => Promise<void>;
  /** Lets a user with limited access pick more photos. */
  manageLimitedAccess: () => Promise<void>;
};

/**
 * Tracks photo library permission and re-checks whenever the app returns to the
 * foreground, so changes made in the OS settings show up immediately.
 */
export function usePhotoPermission(): PhotoPermission {
  const [permission, setPermission] = useState<MediaPermission | null>(null);

  const refresh = useCallback(async () => {
    setPermission(await getMediaRepository().getPermission());
  }, []);

  useEffect(() => {
    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const request = useCallback(async () => {
    setPermission(await getMediaRepository().requestPermission());
  }, []);

  const openSettings = useCallback(() => Linking.openSettings(), []);

  const manageLimitedAccess = useCallback(async () => {
    await getMediaRepository().presentLimitedAccessPicker();
    await refresh();
  }, [refresh]);

  return { permission, request, openSettings, manageLimitedAccess };
}
