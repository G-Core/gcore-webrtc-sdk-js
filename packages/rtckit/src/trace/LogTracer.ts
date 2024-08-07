import type { Tracer } from "./types.js";

import { Logger } from "../Logger.js";

const logger = new Logger("");

/**
 * A tracer that logs to the console
 * @public
 */
export class LogTracer implements Tracer {
  reportError(e: Error) {
    logger.error(e);
  }

  trace(msg: string, data?: Record<string, unknown>) {
    logger.debug(msg, data);
  }
}
