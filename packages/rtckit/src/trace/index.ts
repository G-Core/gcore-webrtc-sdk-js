import type { Tracer } from "./types.js";

const tracer: Tracer = {
  trace: () => {},
  reportError: () => {},
};

export function setTracer(t: Tracer) {
  tracer.trace = t.trace.bind(t);
  tracer.reportError = t.reportError.bind(t);
}

export function reportError(e: unknown) {
  tracer.reportError(e);
}

export function trace(msg: string, data: Record<string, unknown> = {}) {
  tracer.trace(msg, data);
}
