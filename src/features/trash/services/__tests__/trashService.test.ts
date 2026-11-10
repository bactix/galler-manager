import { FakeDecisionRepository } from '@/core/db/fake';
import { FakeMediaRepository, makeFakeAssets } from '@/core/media/fake';

import { TrashService } from '../trashService';

async function setup() {
  const media = new FakeMediaRepository(makeFakeAssets(4));
  const decisions = new FakeDecisionRepository();
  await decisions.record('photo-1', 'delete', 1);
  await decisions.record('photo-2', 'keep', 2);
  await decisions.record('photo-3', 'delete', 3);
  const service = new TrashService(media, decisions);
  return { media, decisions, service };
}

describe('TrashService', () => {
  describe('list', () => {
    it('returns staged photos, most recently staged first', async () => {
      const { service } = await setup();

      const assets = await service.list();

      expect(assets.map((a) => a.id)).toEqual(['photo-3', 'photo-1']);
    });

    it('drops decisions for photos deleted outside the app', async () => {
      const { media, decisions, service } = await setup();
      media.assets = media.assets.filter((a) => a.id !== 'photo-1');

      const assets = await service.list();

      expect(assets.map((a) => a.id)).toEqual(['photo-3']);
      expect(await decisions.idsWithDecision('delete')).toEqual(['photo-3']);
    });
  });

  describe('restore', () => {
    it('unstages a single photo and leaves the rest staged', async () => {
      const { media, decisions, service } = await setup();

      await service.restore('photo-1');

      expect(await decisions.idsWithDecision('delete')).toEqual(['photo-3']);
      expect((await decisions.decidedIds()).has('photo-1')).toBe(false);
      expect(media.deleteCalls).toHaveLength(0);
    });
  });

  describe('confirmAll', () => {
    it('deletes every staged photo in one batched call', async () => {
      const { media, decisions, service } = await setup();

      const result = await service.confirmAll();

      expect(result).toEqual({ status: 'deleted', count: 2 });
      expect(media.deleteCalls).toEqual([['photo-3', 'photo-1']]);
      expect(media.assets.map((a) => a.id)).toEqual(['photo-2', 'photo-4']);
      expect(await decisions.idsWithDecision('delete')).toEqual([]);
    });

    it('keeps kept decisions untouched', async () => {
      const { decisions, service } = await setup();

      await service.confirmAll();

      expect(await decisions.idsWithDecision('keep')).toEqual(['photo-2']);
    });

    it('keeps photos staged when the user cancels the OS dialog', async () => {
      const { media, decisions, service } = await setup();
      media.nextDeleteResult = 'cancelled';

      const result = await service.confirmAll();

      expect(result).toEqual({ status: 'cancelled' });
      expect(media.deleteCalls).toHaveLength(1);
      expect(media.assets).toHaveLength(4);
      expect(await decisions.idsWithDecision('delete')).toEqual(['photo-3', 'photo-1']);
    });

    it('does not call the OS when nothing is staged', async () => {
      const media = new FakeMediaRepository(makeFakeAssets(2));
      const service = new TrashService(media, new FakeDecisionRepository());

      expect(await service.confirmAll()).toEqual({ status: 'empty' });
      expect(media.deleteCalls).toHaveLength(0);
    });
  });
});
