import { createEmitter } from '@/shared/utils/emitter';

import type { Decision, DecisionRecord, DecisionRepository } from './types';

/** In-memory DecisionRepository for tests. Mirrors the SQLite ordering rules. */
export class FakeDecisionRepository implements DecisionRepository {
  // Insertion sequence breaks ties between decisions made in the same millisecond,
  // like rowid does in SQLite.
  private rows = new Map<string, DecisionRecord & { seq: number }>();
  private seq = 0;
  private readonly changes = createEmitter();

  async record(assetId: string, decision: Decision, decidedAt: number) {
    this.rows.set(assetId, { assetId, decision, decidedAt, seq: this.seq++ });
    this.changes.emit();
  }

  async latest() {
    const [top] = this.sorted();
    return top ? { assetId: top.assetId, decision: top.decision, decidedAt: top.decidedAt } : null;
  }

  async remove(assetIds: string[]) {
    assetIds.forEach((id) => this.rows.delete(id));
    this.changes.emit();
  }

  async decidedIds() {
    return new Set(this.rows.keys());
  }

  async idsWithDecision(decision: Decision) {
    return this.sorted()
      .filter((row) => row.decision === decision)
      .map((row) => row.assetId);
  }

  async count(decision: Decision) {
    return (await this.idsWithDecision(decision)).length;
  }

  async clear(decision: Decision) {
    for (const [id, row] of this.rows) {
      if (row.decision === decision) this.rows.delete(id);
    }
    this.changes.emit();
  }

  subscribe(listener: () => void) {
    return this.changes.subscribe(listener);
  }

  private sorted() {
    return [...this.rows.values()].sort((a, b) => b.decidedAt - a.decidedAt || b.seq - a.seq);
  }
}
