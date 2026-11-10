import {
  Asset,
  AssetField,
  MediaType,
  Query,
  addListener,
  getPermissionsAsync,
  presentPermissionsPicker,
  requestPermissionsAsync,
  type AssetInfo,
  type PermissionResponse,
} from 'expo-media-library';
import { Platform } from 'react-native';

import type {
  DeleteResult,
  MediaAsset,
  MediaPermission,
  MediaRepository,
  PhotoPage,
  SortOrder,
} from './types';

// Photos only. On Android 13+ this keeps the prompt to "photos" instead of all media.
const GRANULAR: ['photo'] = ['photo'];

function toPermission(response: PermissionResponse): MediaPermission {
  const { status, canAskAgain, accessPrivileges } = response;
  if (status === 'granted') {
    return { status: accessPrivileges === 'limited' ? 'limited' : 'granted', canAskAgain };
  }
  return { status: status === 'denied' ? 'denied' : 'undetermined', canAskAgain };
}

function toMediaAsset(info: AssetInfo): MediaAsset {
  return {
    id: info.id,
    uri: info.uri,
    width: info.width,
    height: info.height,
    // Milliseconds on both platforms (iOS millisecondsSince1970, Android
    // MediaStore DATE_TAKEN), even though the JSDoc says seconds.
    createdAt: info.creationTime,
  };
}

/**
 * The OS reports a dismissed delete dialog as an error:
 * - Android: the MediaStore delete request returns RESULT_CANCELED, which
 *   expo-media-library rethrows as "User didn't grant write permission…".
 * - iOS: PHPhotoLibrary.performChanges fails with PHPhotosError.userCancelled (3072).
 */
function isUserCancellation(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return Platform.OS === 'android'
    ? message.includes("didn't grant write permission")
    : message.includes('3072');
}

export class ExpoMediaRepository implements MediaRepository {
  async getPermission() {
    return toPermission(await getPermissionsAsync(false, GRANULAR));
  }

  async requestPermission() {
    return toPermission(await requestPermissionsAsync(false, GRANULAR));
  }

  presentLimitedAccessPicker() {
    return presentPermissionsPicker(['photo']);
  }

  async getPhotos({
    offset,
    limit,
    order,
  }: {
    offset: number;
    limit: number;
    order: SortOrder;
  }): Promise<PhotoPage> {
    // Ask for one extra row to learn whether another page exists.
    const assets = await new Query()
      .eq(AssetField.MEDIA_TYPE, MediaType.IMAGE)
      .orderBy({ key: AssetField.CREATION_TIME, ascending: order === 'oldest' })
      .offset(offset)
      .limit(limit + 1)
      .exe();
    const page = assets.slice(0, limit);
    const infos = await Promise.all(page.map((asset) => asset.getInfo()));
    return { assets: infos.map(toMediaAsset), hasMore: assets.length > limit };
  }

  async getAssetsByIds(ids: string[]) {
    const results = await Promise.allSettled(ids.map((id) => new Asset(id).getInfo()));
    // A rejected lookup means the photo no longer exists (or is no longer shared).
    return results.flatMap((result) =>
      result.status === 'fulfilled' ? [toMediaAsset(result.value)] : [],
    );
  }

  async deleteAssets(ids: string[]): Promise<DeleteResult> {
    try {
      await Asset.delete(ids.map((id) => new Asset(id)));
      return 'deleted';
    } catch (error) {
      if (isUserCancellation(error)) return 'cancelled';
      throw error;
    }
  }

  addChangeListener(listener: () => void) {
    const subscription = addListener(() => listener());
    return () => subscription.remove();
  }
}
