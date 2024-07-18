import debug from "debug";
import type { Debugger } from "debug";

const APP_NAME = "@gcore.rtckit-node";

export class Logger {
  public readonly info: Debugger;
  public readonly warn: Debugger;
  public readonly error: Debugger;
  public readonly debug: Debugger;

  constructor(appName = APP_NAME) {
    this.info = debug(`${appName}:INFO`);
    this.warn = debug(`${appName}:WARN`);
    this.error = debug(`${appName}:ERROR`);
    this.debug = debug(`${appName}:DEBUG`);

    this.debug.log = console.debug.bind(console);
    this.info.log = console.info.bind(console);
    this.warn.log = console.warn.bind(console);
    this.error.log = console.error.bind(console);
  }
}

export const logger = new Logger();
