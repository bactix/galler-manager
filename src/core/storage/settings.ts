import { createMMKV, useMMKVString } from 'react-native-mmkv';

import type { SortOrder } from '@/core/media/types';

const storage = createMMKV({ id: 'swipeclean-settings' });

/**
 * Every persisted setting and its default. Add a key here to make it available
 * through getSetting/setSetting/useSetting with full typing.
 */
const DEFAULTS = {
  reviewOrder: 'newest' as SortOrder,
};

export type Settings = typeof DEFAULTS;
export type SettingKey = keyof Settings;

function parse<K extends SettingKey>(key: K, raw: string | undefined): Settings[K] {
  if (raw === undefined) return DEFAULTS[key];
  try {
    return JSON.parse(raw) as Settings[K];
  } catch {
    return DEFAULTS[key];
  }
}

export function getSetting<K extends SettingKey>(key: K): Settings[K] {
  return parse(key, storage.getString(key));
}

export function setSetting<K extends SettingKey>(key: K, value: Settings[K]) {
  storage.set(key, JSON.stringify(value));
}

/** Reactive access to a setting; re-renders when it changes anywhere in the app. */
export function useSetting<K extends SettingKey>(
  key: K,
): [Settings[K], (value: Settings[K]) => void] {
  const [raw, setRaw] = useMMKVString(key, storage);
  return [parse(key, raw), (value) => setRaw(JSON.stringify(value))];
}
