export type Decision = 'keep' | 'delete';

export type DecisionRecord = {
  assetId: string;
  decision: Decision;
  /** Milliseconds since epoch. */
  decidedAt: number;
};

/**
 * Persistent swipe decisions, shared by every feature that needs them. The
 * Drizzle implementation backs the app; FakeDecisionRepository backs tests.
 */
export interface DecisionRepository {
  /** Inserts or replaces the decision for an asset. */
  record(assetId: string, decision: Decision, decidedAt: number): Promise<void>;
  /** The most recently made decision, or null when there are none. */
  latest(): Promise<DecisionRecord | null>;
  remove(assetIds: string[]): Promise<void>;
  /** Every asset id that has a decision of any kind. */
  decidedIds(): Promise<Set<string>>;
  /** Asset ids with the given decision, most recent first. */
  idsWithDecision(decision: Decision): Promise<string[]>;
  count(decision: Decision): Promise<number>;
  /** Removes every decision of the given kind. */
  clear(decision: Decision): Promise<void>;
  /** Called after every write. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
}
