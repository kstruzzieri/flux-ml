// Mock for Wails runtime - used in Jest tests

type Callback = (...data: unknown[]) => void

const listeners: Map<string, Set<Callback>> = new Map()

export function EventsOn(eventName: string, callback: Callback): () => void {
  if (!listeners.has(eventName)) {
    listeners.set(eventName, new Set())
  }
  listeners.get(eventName)!.add(callback)
  return () => {
    listeners.get(eventName)?.delete(callback)
  }
}

export function EventsOff(eventName: string): void {
  listeners.delete(eventName)
}

export function EventsEmit(eventName: string, ...data: unknown[]): void {
  listeners.get(eventName)?.forEach((cb) => cb(...data))
}

// Test helper: clear all listeners
export function __resetListeners(): void {
  listeners.clear()
}
