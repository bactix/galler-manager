import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const decisions = sqliteTable(
  'decisions',
  {
    assetId: text('asset_id').primaryKey(),
    decision: text('decision', { enum: ['keep', 'delete'] }).notNull(),
    decidedAt: integer('decided_at').notNull(),
  },
  (table) => [
    index('decisions_decided_at_idx').on(table.decidedAt),
    index('decisions_decision_idx').on(table.decision),
  ],
);
