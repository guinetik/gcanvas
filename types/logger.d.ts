/**
 * GCanvas Logger Module
 * Logging utilities and debug visualization.
 * @module logger
 */

// ==========================================================================
// Logger Class
// ==========================================================================

/**
 * Logger class for debugging and console output.
 * Provides named loggers with configurable levels and output.
 */
export class Logger {
  /** Debug log level */
  static DEBUG: number;
  /** Info log level */
  static INFO: number;
  /** Warning log level */
  static WARN: number;
  /** Error log level */
  static ERROR: number;

  /**
   * Creates a new Logger instance.
   * @param name - The name/category for this logger
   */
  constructor(name: string);

  /** Log a debug message */
  log(...args: any[]): void;
  /** Log an info message */
  info(...args: any[]): void;
  /** Log a warning message */
  warn(...args: any[]): void;
  /** Log an error message */
  error(...args: any[]): void;
  /** Start a collapsed console group */
  groupCollapsed(label: string): void;
  /** End a console group */
  groupEnd(): void;
  /** Start a timer with the given label */
  time(label: string): void;
  /** End and log a timer */
  timeEnd(label: string): void;

  /**
   * Get or create a logger with the given name.
   * @param name - Logger name/category
   */
  static getLogger(name: string): Logger;
  /** Set the global log level */
  static setLevel(level: number): void;
  /** Set the output target (console or custom object) */
  static setOutput(output: Console | object): void;
  /** Enable all loggers */
  static enable(): void;
  /** Disable all loggers */
  static disable(): void;
  /** Enable all loggers (alias) */
  static enableAll(): void;
  /** Disable all loggers (alias) */
  static disableAll(): void;
  /** Enable a specific logger by name */
  static enableFor(name: string): void;
  /** Disable a specific logger by name */
  static disableFor(name: string): void;
}

// ==========================================================================
// Loggable Base Class
// ==========================================================================

/** Options for Loggable constructor */
export interface LoggableOptions {
  /** Name for the logger instance */
  name?: string;
}

/**
 * Base class that provides logging capabilities to subclasses.
 * Extend this class to add automatic logging support.
 */
export class Loggable {
  /** Instance name */
  name: string;
  /** @internal Logger instance */
  protected _logger: Logger;

  /**
   * Creates a new Loggable instance.
   * @param options - Configuration options
   */
  constructor(options?: LoggableOptions);

  /** Get the logger instance for this object */
  get logger(): Logger;

  /**
   * Log a trace message with optional custom text.
   * @param msg - Optional message to include
   */
  trace(msg?: string): void;

  /**
   * Get or create a logger for this instance.
   * @param options - Logger options
   * @internal
   */
  protected getLogger(options?: LoggableOptions): Logger;
}

// ==========================================================================
// Debug Tab
// ==========================================================================

/**
 * Debug visualization panel for runtime inspection.
 * Singleton class that provides on-screen debug information.
 */
export class DebugTab {
  /**
   * Get the singleton DebugTab instance.
   */
  static getInstance(): DebugTab;
}
