import debug from "debug";
import type { Debugger } from "debug";

const APP_NAME = "@gcore.rtckit";

export class Logger {
  public readonly info: Debugger;
  public readonly warn: Debugger;
  public readonly error: Debugger;
  public readonly debug: Debugger;

  constructor(namespace: string, appName = APP_NAME) {
    this.info = debug(`${appName}:INFO:${namespace}`);
    this.warn = debug(`${appName}:WARN:${namespace}`);
    this.error = debug(`${appName}:ERROR:${namespace}`);
    this.debug = debug(`${appName}:DEBUG:${namespace}`);

    this.debug.log = console.debug.bind(console);
    this.info.log = console.info.bind(console);
    this.warn.log = console.warn.bind(console);
    this.error.log = console.error.bind(console);
  }
}
