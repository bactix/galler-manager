export type Emitter = {
  emit(): void;
  subscribe(listener: () => void): () => void;
};

export function createEmitter(): Emitter {
  const listeners = new Set<() => void>();
  return {
    emit() {
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
