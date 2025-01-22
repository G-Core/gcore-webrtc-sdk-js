import type { Tracer } from "./Tracer.js";

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
 * @public
 * @param e - error to report
 */
export function reportError(e: unknown) {
  tracer.reportError(e);
}

/**
 * @public
 * @param msg - message to attach to the trace
 * @param data - additional attributes to attach to the trace message
 */
export function trace(msg: string, data: Record<string, unknown> = {}) {
  tracer.trace(msg, data);
}
