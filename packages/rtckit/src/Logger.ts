const APP_NAME = "gcore-webrtc";

type WriteFn = (...args: any[]) => void;

/**
 * @internal
 */
export type Debugger = WriteFn;

type Pattern = RegExp;

const currentPatterns: Pattern[] = [];

/**
 * @beta
 * @param patterns - comma-separated list of patterns, can contain '*' as a wildcard
 */
export function enable(patterns: string) {
  currentPatterns.splice(
    0,
    currentPatterns.length,
    ...patterns.split(",").filter(Boolean).map(parsePattern),
  );
}

/**
 * @beta
 */
export function disable() {
  currentPatterns.splice(0, currentPatterns.length);
}

function parsePattern(pattern: string): Pattern {
  return new RegExp("^" + pattern.replace(/\\*/g, "[\\w-]+"), "i");
}

function pass(namespace: string): boolean {
  return currentPatterns.some((p) => p.test(namespace));
}

function debug(namespace: string, writer: WriteFn): Debugger {
  if (pass(namespace)) {
    return writer;
  }
  return nullWriter;
}

function nullWriter() {}

/**
 * Logging utility with [debug](https://www.npmjs.com/package/debug)-like API
 * @internal
 */
export class Logger {
  public readonly info: Debugger;
  public readonly warn: Debugger;
  public readonly error: Debugger;
  public readonly debug: Debugger;

  constructor(namespace: string, appName = APP_NAME) {
    const ns = namespace ? `:${namespace}` : "";
    this.info = debug(`${appName}:INFO${ns}`, console.info.bind(console));
    this.warn = debug(`${appName}:WARN${ns}`, console.warn.bind(console));
    this.error = debug(`${appName}:ERROR${ns}`, console.error.bind(console));
    this.debug = debug(`${appName}:DEBUG${ns}`, console.debug.bind(console));
  }
}
