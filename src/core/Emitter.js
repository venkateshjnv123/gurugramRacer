// Minimal event emitter.
export default class Emitter {
  constructor() {
    this.listeners = new Map();
  }

  on(name, fn) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name).add(fn);
    return () => this.off(name, fn);
  }

  off(name, fn) {
    this.listeners.get(name)?.delete(fn);
  }

  emit(name, ...args) {
    for (const fn of [...(this.listeners.get(name) ?? [])]) fn(...args);
  }
}
