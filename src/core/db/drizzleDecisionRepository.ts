import { count, desc, eq, inArray, sql } from 'drizzle-orm';

import { createEmitter } from '@/shared/utils/emitter';

import type { Database } from './client';
import { decisions } from './schema';
import type { Decision, DecisionRepository } from './types';

// SQLite caps bound parameters per statement; stay well below the limit.
const MAX_IDS_PER_STATEMENT = 500;

// rowid breaks ties between decisions made in the same millisecond.
const newestFirst = [desc(decisions.decidedAt), desc(sql`rowid`)];

export class DrizzleDecisionRepository implements DecisionRepository {
  private readonly changes = createEmitter();

  constructor(private readonly db: Database) {}

  async record(assetId: string, decision: Decision, decidedAt: number) {
    await this.db
      .insert(decisions)
      .values({ assetId, decision, decidedAt })
      .onConflictDoUpdate({ target: decisions.assetId, set: { decision, decidedAt } });
    this.changes.emit();
  }

  async latest() {
    const [row] = await this.db
      .select()
      .from(decisions)
      .orderBy(...newestFirst)
      .limit(1);
    return row ?? null;
  }

  async remove(assetIds: string[]) {
    if (assetIds.length === 0) return;
    for (let i = 0; i < assetIds.length; i += MAX_IDS_PER_STATEMENT) {
      const chunk = assetIds.slice(i, i + MAX_IDS_PER_STATEMENT);
      await this.db.delete(decisions).where(inArray(decisions.assetId, chunk));
    }
    this.changes.emit();
  }

  async decidedIds() {
    const rows = await this.db.select({ assetId: decisions.assetId }).from(decisions);
    return new Set(rows.map((row) => row.assetId));
  }

  async idsWithDecision(decision: Decision) {
    const rows = await this.db
      .select({ assetId: decisions.assetId })
      .from(decisions)
      .where(eq(decisions.decision, decision))
      .orderBy(...newestFirst);
    return rows.map((row) => row.assetId);
  }

  async count(decision: Decision) {
    const [row] = await this.db
      .select({ value: count() })
      .from(decisions)
      .where(eq(decisions.decision, decision));
    return row?.value ?? 0;
  }

  async clear(decision: Decision) {
    await this.db.delete(decisions).where(eq(decisions.decision, decision));
    this.changes.emit();
  }

  subscribe(listener: () => void) {
    return this.changes.subscribe(listener);
  }
}
