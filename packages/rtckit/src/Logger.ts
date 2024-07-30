const APP_NAME = "gcore-webrtc";

type WriteFn = (...args: any[]) => void;

type Debugger = WriteFn;

type Pattern = RegExp;

const currentPatterns: Pattern[] = [];

export function enable(patterns: string) {
  currentPatterns.splice(
    0,
    currentPatterns.length,
    ...patterns.split(",").filter(Boolean).map(parsePattern),
  );
}

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

export class Logger {
  public readonly info: Debugger;
  public readonly warn: Debugger;
  public readonly error: Debugger;
  public readonly debug: Debugger;

  constructor(namespace: string, appName = APP_NAME) {
    this.info = debug(`${appName}:INFO:${namespace}`, console.info.bind(console));
    this.warn = debug(`${appName}:WARN:${namespace}`, console.warn.bind(console));
    this.error = debug(`${appName}:ERROR:${namespace}`, console.error.bind(console));
    this.debug = debug(`${appName}:DEBUG:${namespace}`, console.debug.bind(console));
  }
}
