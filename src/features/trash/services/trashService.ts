import type { DecisionRepository } from '@/core/db/types';
import type { MediaAsset, MediaRepository } from '@/core/media/types';

export type ConfirmResult =
  | { status: 'deleted'; count: number }
  | { status: 'cancelled' }
  | { status: 'empty' };

export class TrashService {
  constructor(
    private readonly media: MediaRepository,
    private readonly decisions: DecisionRepository,
  ) {}

  /**
   * Photos staged for deletion, most recently staged first. Decisions for photos
   * that were removed outside the app are cleaned up.
   */
  async list(): Promise<MediaAsset[]> {
    const ids = await this.decisions.idsWithDecision('delete');
    if (ids.length === 0) return [];
    const assets = await this.media.getAssetsByIds(ids);
    if (assets.length < ids.length) {
      const found = new Set(assets.map((a) => a.id));
      await this.decisions.remove(ids.filter((id) => !found.has(id)));
    }
    return assets;
  }

  /** Unstages a photo, which sends it back to the deck. */
  restore(assetId: string) {
    return this.decisions.remove([assetId]);
  }

  /**
   * Deletes every staged photo in one call so the OS dialog appears once. If the
   * user cancels the dialog, nothing changes and the photos stay staged.
   */
  async confirmAll(): Promise<ConfirmResult> {
    const ids = await this.decisions.idsWithDecision('delete');
    if (ids.length === 0) return { status: 'empty' };

    const result = await this.media.deleteAssets(ids);
    if (result === 'cancelled') return { status: 'cancelled' };

    await this.decisions.remove(ids);
    return { status: 'deleted', count: ids.length };
  }
}
