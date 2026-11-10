import { create } from 'zustand';

import { getDecisionRepository } from '@/core/db';
import { getMediaRepository } from '@/core/media';
import type { MediaAsset, SortOrder } from '@/core/media/types';

import { SwipeService } from '../services/swipeService';

/** Fetch more photos when fewer than this many are queued. */
export const LOW_WATER_MARK = 10;

export type SwipeDirection = 'left' | 'right';

type SwipeState = {
  queue: MediaAsset[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  hasMore: boolean;
  /** Photos marked for deletion and waiting in Trash. */
  stagedCount: number;
  canUndo: boolean;
  error: string | null;
};

type SwipeActions = {
  /** Clears the deck and loads it from the start of the library. */
  start: (order: SortOrder) => Promise<void>;
  /** Called when a swipe (or button press) completes. */
  swiped: (asset: MediaAsset, direction: SwipeDirection) => void;
  undo: () => Promise<void>;
  /** Reloads the deck if decisions changed outside this feature, e.g. in Trash. */
  refreshIfStale: () => Promise<void>;
  refreshCounts: () => Promise<void>;
};

// Non-reactive bookkeeping that components never render.
let service: SwipeService | null = null;
let offset = 0;
let order: SortOrder = 'newest';
// Bumped on every start(), so results from an older load are ignored.
let generation = 0;
let loadingMore = false;
let stale = false;
let selfWrites = 0;
// Every DB write runs in order, so an undo always sees the swipes before it.
let writeChain: Promise<unknown> = Promise.resolve();

function getService() {
  if (!service) {
    service = new SwipeService(getMediaRepository(), getDecisionRepository());
    // Writes from other features (Trash restore/confirm, Settings reset) make
    // the deck stale. Our own writes happen while selfWrites > 0.
    getDecisionRepository().subscribe(() => {
      if (selfWrites === 0) stale = true;
    });
  }
  return service;
}

function enqueueWrite<T>(write: () => Promise<T>): Promise<T> {
  const run = writeChain.then(async () => {
    selfWrites++;
    try {
      return await write();
    } finally {
      selfWrites--;
    }
  });
  writeChain = run.catch(() => {});
  return run;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export const useSwipeStore = create<SwipeState & SwipeActions>()((set, get) => {
  async function loadMore(gen: number) {
    if (loadingMore || !get().hasMore) return;
    loadingMore = true;
    try {
      const page = await getService().fetchUnreviewed({
        offset,
        order,
        minCount: LOW_WATER_MARK,
        exclude: new Set(get().queue.map((a) => a.id)),
      });
      if (gen !== generation) return;
      offset = page.nextOffset;
      set((state) => ({
        queue: [...state.queue, ...page.assets],
        hasMore: page.hasMore,
        status: 'ready',
      }));
    } catch (error) {
      if (gen === generation) set({ status: 'error', error: errorMessage(error) });
    } finally {
      if (gen === generation) loadingMore = false;
    }
  }

  return {
    queue: [],
    status: 'idle',
    hasMore: true,
    stagedCount: 0,
    canUndo: false,
    error: null,

    async start(nextOrder) {
      const gen = ++generation;
      order = nextOrder;
      offset = 0;
      loadingMore = false;
      stale = false;
      set({ queue: [], status: 'loading', hasMore: true, error: null });
      await Promise.all([loadMore(gen), get().refreshCounts()]);
    },

    swiped(asset, direction) {
      // Update the deck first so the next card shows immediately; the write follows.
      set((state) => ({
        queue: state.queue.filter((a) => a.id !== asset.id),
        canUndo: true,
        stagedCount: state.stagedCount + (direction === 'left' ? 1 : 0),
      }));
      enqueueWrite(() =>
        direction === 'left' ? getService().delete(asset) : getService().keep(asset),
      ).catch((error) => set({ error: errorMessage(error) }));

      if (get().queue.length < LOW_WATER_MARK) loadMore(generation);
    },

    async undo() {
      try {
        const result = await enqueueWrite(() => getService().undo());
        if (result) {
          set((state) => ({
            queue: [result.asset, ...state.queue.filter((a) => a.id !== result.asset.id)],
          }));
        }
      } catch (error) {
        set({ error: errorMessage(error) });
      }
      await get().refreshCounts();
    },

    async refreshIfStale() {
      if (stale) await get().start(order);
      else await get().refreshCounts();
    },

    async refreshCounts() {
      // Let pending swipes land first, or the optimistic counts would be overwritten.
      await writeChain;
      const [stagedCount, canUndo] = await Promise.all([
        getService().stagedCount(),
        getService().canUndo(),
      ]);
      set({ stagedCount, canUndo });
    },
  };
});
