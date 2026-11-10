import { FakeDecisionRepository } from '@/core/db/fake';
import { FakeMediaRepository, makeFakeAssets } from '@/core/media/fake';

import { PAGE_SIZE, SwipeService } from '../swipeService';

function setup(photoCount = 5) {
  const assets = makeFakeAssets(photoCount);
  const media = new FakeMediaRepository(assets);
  const decisions = new FakeDecisionRepository();
  let clock = 1_000;
  const service = new SwipeService(media, decisions, () => clock++);
  return { assets, media, decisions, service };
}

describe('SwipeService', () => {
  describe('keep', () => {
    it('records a keep decision', async () => {
      const { assets, decisions, service } = setup();

      await service.keep(assets[0]);

      expect(await decisions.latest()).toMatchObject({ assetId: 'photo-1', decision: 'keep' });
    });

    it('excludes kept photos from later sessions', async () => {
      const { assets, media, decisions, service } = setup(3);
      await service.keep(assets[0]);

      // A new service over the same storage stands in for a fresh app launch.
      const nextSession = new SwipeService(media, decisions);
      const page = await nextSession.fetchUnreviewed({ offset: 0, order: 'newest', minCount: 10 });

      expect(page.assets.map((a) => a.id)).toEqual(['photo-2', 'photo-3']);
    });
  });

  describe('delete', () => {
    it('stages the photo without deleting it from the library', async () => {
      const { assets, media, decisions, service } = setup();

      await service.delete(assets[1]);

      expect(await decisions.idsWithDecision('delete')).toEqual(['photo-2']);
      expect(media.deleteCalls).toHaveLength(0);
      expect(media.assets).toHaveLength(5);
      expect(await service.stagedCount()).toBe(1);
    });

    it('excludes staged photos from the deck', async () => {
      const { assets, service } = setup(3);
      await service.delete(assets[1]);

      const page = await service.fetchUnreviewed({ offset: 0, order: 'newest', minCount: 10 });

      expect(page.assets.map((a) => a.id)).toEqual(['photo-1', 'photo-3']);
    });
  });

  describe('undo', () => {
    it('reverts the most recent decision and returns its photo', async () => {
      const { assets, decisions, service } = setup();
      await service.keep(assets[0]);
      await service.delete(assets[1]);

      const result = await service.undo();

      expect(result).toEqual({ asset: assets[1], decision: 'delete' });
      expect(await decisions.decidedIds()).toEqual(new Set(['photo-1']));
    });

    it('walks back through decisions one at a time', async () => {
      const { assets, service } = setup();
      await service.keep(assets[0]);
      await service.delete(assets[1]);

      await service.undo();
      const second = await service.undo();

      expect(second).toEqual({ asset: assets[0], decision: 'keep' });
      expect(await service.undo()).toBeNull();
    });

    it('makes the photo reviewable again', async () => {
      const { assets, service } = setup(2);
      await service.keep(assets[0]);
      await service.undo();

      const page = await service.fetchUnreviewed({ offset: 0, order: 'newest', minCount: 10 });

      expect(page.assets.map((a) => a.id)).toEqual(['photo-1', 'photo-2']);
    });

    it('returns null when there is nothing to undo', async () => {
      const { service } = setup();

      expect(await service.undo()).toBeNull();
    });

    it('skips decisions for photos that no longer exist', async () => {
      const { assets, media, decisions, service } = setup();
      await service.keep(assets[0]);
      await service.keep(assets[1]);
      media.assets = media.assets.filter((a) => a.id !== 'photo-2');

      const result = await service.undo();

      expect(result?.asset.id).toBe('photo-1');
      expect(await decisions.decidedIds()).toEqual(new Set());
    });
  });

  describe('fetchUnreviewed', () => {
    it('reads further pages when a page is fully reviewed', async () => {
      const { assets, service } = setup(PAGE_SIZE + 5);
      for (const asset of assets.slice(0, PAGE_SIZE)) await service.keep(asset);

      const page = await service.fetchUnreviewed({ offset: 0, order: 'newest', minCount: 3 });

      expect(page.assets.map((a) => a.id)).toEqual(
        assets.slice(PAGE_SIZE).map((a) => a.id),
      );
      expect(page.nextOffset).toBe(PAGE_SIZE + 5);
      expect(page.hasMore).toBe(false);
    });

    it('skips photos that are already queued', async () => {
      const { service } = setup(3);

      const page = await service.fetchUnreviewed({
        offset: 0,
        order: 'newest',
        minCount: 10,
        exclude: new Set(['photo-1']),
      });

      expect(page.assets.map((a) => a.id)).toEqual(['photo-2', 'photo-3']);
    });

    it('honours the oldest-first order', async () => {
      const { service } = setup(3);

      const page = await service.fetchUnreviewed({ offset: 0, order: 'oldest', minCount: 10 });

      expect(page.assets.map((a) => a.id)).toEqual(['photo-3', 'photo-2', 'photo-1']);
    });
  });
});
