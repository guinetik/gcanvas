// Logger.js
export class Logger {
  static ERROR = 1;
  static WARN = 2;
  static INFO = 3;
  static DEBUG = 4;

  static globalLevel = Logger.ERROR;
  static enabledClasses = new Set();
  static output = console;
  static enabled = true;

  static disableAll() {
    Logger.enabledClasses = new Set();
    Logger.globalLevel = 0;
  }

  static disable() {
    Logger.enabled = false;
  }

  static enable() {
    Logger.enabled = true;
  }

  static setLevel(level) {
    Logger.globalLevel = level;
  }

  static enableFor(className) {
    Logger.enabledClasses.add(className);
  }

  static disableFor(className) {
    Logger.enabledClasses.delete(className);
  }

  static setOutput(outputInstance) {
    Logger.output = outputInstance;
  }

  constructor(className) {
    this.className = className;
  }

  static loggerz = [];

  static getLogger(className) {
    if (!Logger.loggerz[className]) {
      Logger.loggerz[className] = new Logger(className);
    }
    return Logger.loggerz[className];
  }

  _log(level, method, ...args) {
    if (
      Logger.enabled &&
      (Logger.globalLevel >= level || Logger.enabledClasses.has(this.className))
    ) {
      Logger.output[method](`[${this.className}]`, ...args);
    }
  }

  log(...args) {
    this._log(Logger.INFO, "log", ...args);
  }

  warn(...args) {
    this._log(Logger.WARN, "warn", ...args);
  }

  error(...args) {
    this._log(Logger.ERROR, "error", ...args);
  }

  debug(...args) {
    this._log(Logger.DEBUG, "log", ...args);
  }

  table(...args) {
    this._log(Logger.INFO, "table", ...args);
  }

  groupCollapsed(label) {
    if (Logger.enabled) {
      Logger.output.groupCollapsed(`[${this.className}] ${label}`);
    }
  }

  groupEnd() {
    if (Logger.enabled) {
      Logger.output.groupEnd();
    }
  }

  time(label) {
    if (Logger.enabled) {
      Logger.output.time(`[${this.className}] ${label}`);
    }
  }

  timeEnd(label) {
    if (Logger.enabled) {
      Logger.output.timeEnd(`[${this.className}] ${label}`);
    }
  }

  clear() {
    Logger.output.clear();
  }
}


