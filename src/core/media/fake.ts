import { createEmitter } from '@/shared/utils/emitter';

import type {
  DeleteResult,
  MediaAsset,
  MediaPermission,
  MediaRepository,
  PhotoPage,
  SortOrder,
} from './types';

/** In-memory MediaRepository for tests. */
export class FakeMediaRepository implements MediaRepository {
  assets: MediaAsset[];
  permission: MediaPermission = { status: 'granted', canAskAgain: true };
  /** What the next deleteAssets call returns, to simulate the user cancelling the OS dialog. */
  nextDeleteResult: DeleteResult = 'deleted';
  readonly deleteCalls: string[][] = [];
  private readonly changes = createEmitter();

  constructor(assets: MediaAsset[] = []) {
    this.assets = [...assets];
  }

  async getPermission() {
    return this.permission;
  }

  async requestPermission() {
    return this.permission;
  }

  async presentLimitedAccessPicker() {}

  async getPhotos({
    offset,
    limit,
    order,
  }: {
    offset: number;
    limit: number;
    order: SortOrder;
  }): Promise<PhotoPage> {
    const sorted = [...this.assets].sort((a, b) =>
      order === 'newest'
        ? (b.createdAt ?? 0) - (a.createdAt ?? 0)
        : (a.createdAt ?? 0) - (b.createdAt ?? 0),
    );
    return {
      assets: sorted.slice(offset, offset + limit),
      hasMore: offset + limit < sorted.length,
    };
  }

  async getAssetsByIds(ids: string[]) {
    const byId = new Map(this.assets.map((a) => [a.id, a]));
    return ids.flatMap((id) => byId.get(id) ?? []);
  }

  async deleteAssets(ids: string[]) {
    this.deleteCalls.push([...ids]);
    const result = this.nextDeleteResult;
    if (result === 'deleted') {
      const doomed = new Set(ids);
      this.assets = this.assets.filter((a) => !doomed.has(a.id));
      this.changes.emit();
    }
    return result;
  }

  addChangeListener(listener: () => void) {
    return this.changes.subscribe(listener);
  }
}

/** Builds `count` photos with ids `photo-1`…`photo-N`, newest first by id number. */
export function makeFakeAssets(count: number): MediaAsset[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `photo-${i + 1}`,
    uri: `file:///photos/${i + 1}.jpg`,
    width: 1000,
    height: 1500,
    createdAt: (count - i) * 1000,
  }));
}
