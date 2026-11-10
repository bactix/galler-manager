import { db } from './client';
import { DrizzleDecisionRepository } from './drizzleDecisionRepository';
import type { DecisionRepository } from './types';

export type * from './types';
export { DatabaseProvider } from './DatabaseProvider';

let decisionRepository: DecisionRepository = new DrizzleDecisionRepository(db);

export function getDecisionRepository() {
  return decisionRepository;
}

/** Swaps the implementation, e.g. for component tests. */
export function setDecisionRepository(repository: DecisionRepository) {
  decisionRepository = repository;
}
