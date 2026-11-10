import type { Decision, DecisionRepository } from '@/core/db/types';
import type { MediaAsset, MediaRepository, SortOrder } from '@/core/media/types';

export const PAGE_SIZE = 50;

export type DeckPage = {
  assets: MediaAsset[];
  /** Library offset to pass to the next fetch. */
  nextOffset: number;
  hasMore: boolean;
};

export type UndoResult = { asset: MediaAsset; decision: Decision };

export class SwipeService {
  constructor(
    private readonly media: MediaRepository,
    private readonly decisions: DecisionRepository,
    private readonly now: () => number = Date.now,
  ) {}

  /**
   * Reads library pages starting at `offset` until at least `minCount` photos
   * without a decision are found or the library runs out. Photos in `exclude`
   * (already queued) are skipped.
   */
  async fetchUnreviewed(options: {
    offset: number;
    order: SortOrder;
    minCount: number;
    exclude?: ReadonlySet<string>;
  }): Promise<DeckPage> {
    const { order, minCount, exclude } = options;
    const decided = await this.decisions.decidedIds();
    const assets: MediaAsset[] = [];
    let offset = options.offset;
    let hasMore = true;

    while (hasMore && assets.length < minCount) {
      const page = await this.media.getPhotos({ offset, limit: PAGE_SIZE, order });
      offset += page.assets.length;
      hasMore = page.hasMore && page.assets.length > 0;
      for (const asset of page.assets) {
        if (!decided.has(asset.id) && !exclude?.has(asset.id)) assets.push(asset);
      }
    }

    return { assets, nextOffset: offset, hasMore };
  }

  keep(asset: MediaAsset) {
    return this.decisions.record(asset.id, 'keep', this.now());
  }

  /** Stages the photo for deletion. Nothing leaves the library until Trash is confirmed. */
  delete(asset: MediaAsset) {
    return this.decisions.record(asset.id, 'delete', this.now());
  }

  /**
   * Reverts the most recent decision and returns its photo so it can go back on
   * top of the deck. Decisions for photos that no longer exist are dropped and
   * skipped. Returns null when there is nothing to undo.
   */
  async undo(): Promise<UndoResult | null> {
    for (;;) {
      const latest = await this.decisions.latest();
      if (!latest) return null;
      await this.decisions.remove([latest.assetId]);
      const [asset] = await this.media.getAssetsByIds([latest.assetId]);
      if (asset) return { asset, decision: latest.decision };
    }
  }

  stagedCount() {
    return this.decisions.count('delete');
  }

  async canUndo() {
    return (await this.decisions.latest()) !== null;
  }
}
