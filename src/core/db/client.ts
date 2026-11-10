import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

const sqlite = openDatabaseSync('swipeclean.db');

export const db = drizzle(sqlite, { schema });

export type Database = typeof db;
