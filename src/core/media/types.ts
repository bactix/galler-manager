export type MediaAsset = {
  id: string;
  uri: string;
  width: number;
  height: number;
  /** Milliseconds since epoch, or null when the OS doesn't report it. */
  createdAt: number | null;
};

export type SortOrder = 'newest' | 'oldest';

export type PhotoPage = {
  assets: MediaAsset[];
  hasMore: boolean;
};

/** `cancelled` means the user dismissed the OS confirmation dialog. */
export type DeleteResult = 'deleted' | 'cancelled';

export type PermissionStatus = 'granted' | 'limited' | 'denied' | 'undetermined';

export type MediaPermission = {
  status: PermissionStatus;
  canAskAgain: boolean;
};

/**
 * The only way the app talks to the photo library. The Expo implementation is
 * the single place that imports expo-media-library; tests use FakeMediaRepository.
 */
export interface MediaRepository {
  getPermission(): Promise<MediaPermission>;
  requestPermission(): Promise<MediaPermission>;
  /** Lets a user with limited access change which photos are shared. */
  presentLimitedAccessPicker(): Promise<void>;
  getPhotos(options: { offset: number; limit: number; order: SortOrder }): Promise<PhotoPage>;
  /** Returns the assets that still exist, in the order of `ids`. Missing ids are skipped. */
  getAssetsByIds(ids: string[]): Promise<MediaAsset[]>;
  /** Deletes all assets in one OS call, so the confirmation dialog appears once. */
  deleteAssets(ids: string[]): Promise<DeleteResult>;
  /** Called when the library changes outside the app. Returns an unsubscribe function. */
  addChangeListener(listener: () => void): () => void;
}
