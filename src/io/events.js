export class EventEmitter {
  constructor() {
    this.listeners = {};
  }

  on(type, callback) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(callback);
  }

  off(type, callback) {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter((cb) => cb !== callback);
  }

  emit(type, payload) {
    if (!this.listeners[type]) return;
    this.listeners[type].forEach((cb) => cb(payload));
  }
}
