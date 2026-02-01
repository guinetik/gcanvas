import { expect, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock Painter class
vi.mock('../src/painter/painter', () => ({
  Painter: {
    ctx: {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      beginPath: vi.fn(),
      fill: vi.fn(),
    },
    shapes: {
      outlineRect: vi.fn(),
      rect: vi.fn(),
    },
    logger: {
      log: vi.fn(),
    },
    save: vi.fn(),
    restore: vi.fn(),
    translateTo: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    useCtx: vi.fn((callback) => {
      const mockCtx = {
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        globalCompositeOperation: 'source-over',
        fillStyle: '',
        beginPath: vi.fn(),
        arc: vi.fn(),
        rect: vi.fn(),
        fill: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
      };
      callback(mockCtx);
    }),
  },
}));

// Mock Loggable class
vi.mock('../src/logger/loggable', () => ({
  Loggable: class {
    constructor() {
      this.logger = {
        log: vi.fn(),
        groupCollapsed: vi.fn(),
        groupEnd: vi.fn(),
      };
    }
  },
}));

// Mock EventEmitter for io module
vi.mock('../src/io/index', () => ({
  EventEmitter: class {
    constructor() {
      this._events = {};
    }
    on(event, callback) {
      if (!this._events[event]) this._events[event] = [];
      this._events[event].push(callback);
    }
    off(event, callback) {
      if (!this._events[event]) return;
      this._events[event] = this._events[event].filter(cb => cb !== callback);
    }
    emit(event, ...args) {
      if (!this._events[event]) return;
      this._events[event].forEach(cb => cb(...args));
    }
  },
  Keys: {},
  Input: class {},
  Touch: class {},
}));

// Mock mixins/anchor
vi.mock('../src/mixins/anchor', () => ({
  applyAnchor: vi.fn(),
}));

// Mock util/zindex
vi.mock('../src/util/zindex', () => ({
  ZOrderedCollection: class {
    constructor() {
      this.children = [];
      this._owner = null;
    }
    add(item) {
      this.children.push(item);
    }
    remove(item) {
      const idx = this.children.indexOf(item);
      if (idx > -1) {
        this.children.splice(idx, 1);
        return true;
      }
      return false;
    }
    clear() {
      this.children = [];
    }
    getSortedChildren() {
      return this.children;
    }
    bringToFront() {}
    sendToBack() {}
    bringForward() {}
    sendBackward() {}
  },
}));

// Reset mocks after each test
afterEach(() => {
  vi.clearAllMocks();
}); 