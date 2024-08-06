import type { Tracer } from "./types.js";

const tracer: Tracer = {
  trace: () => {},
  reportError: () => {},
};

/**
 * @public
 * Sets a tracer implementation, e.g., LogTracer or SentryTracer
 */
export function setTracer(t: Tracer) {
  tracer.trace = t.trace.bind(t);
  tracer.reportError = t.reportError.bind(t);
}

/**
 * @internal
 * @param e
 */
export function reportError(e: unknown) {
  tracer.reportError(e);
}

/**
 * @internal
 * @param msg
 * @param data
 */
export function trace(msg: string, data: Record<string, unknown> = {}) {
  tracer.trace(msg, data);
}
