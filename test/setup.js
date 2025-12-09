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
    },
    shapes: {
      outlineRect: vi.fn(),
    },
    logger: {
      log: vi.fn(),
    },
  },
}));

// Mock Loggable class
vi.mock('../src/logger/loggable', () => ({
  Loggable: class {
    constructor() {
      this.logger = {
        log: vi.fn(),
      };
    }
  },
}));

// Reset mocks after each test
afterEach(() => {
  vi.clearAllMocks();
}); 