import { ExpoMediaRepository } from './expoMediaRepository';
import type { MediaRepository } from './types';

export type * from './types';

let instance: MediaRepository = new ExpoMediaRepository();

export function getMediaRepository() {
  return instance;
}

/** Swaps the implementation, e.g. for component tests or a demo build. */
export function setMediaRepository(repository: MediaRepository) {
  instance = repository;
}
