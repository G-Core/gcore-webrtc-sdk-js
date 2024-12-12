/**
 * Gcore WebRTC Kit
 */

import pkg from "../package.json";

/**
 * @public
 */
export const version = pkg.version;

export * from "./Logger.js";
export * from "./MediaDevicesHelper.js";
export * from "./WebrtcStreaming.js";
export * from "./aux/IngesterErrorHandler.js";
export * from "./aux/plugins.js";
export * from "./aux/StreamMeta.js";
export * from "./aux/VideoResolutionChangeDetector.js";
export * from "./errors.js";
export * from "./stats/WebrtcReporter.js";
export * from "./stats/types.js";
export { LogTracer } from "./trace/LogTracer.js";
export { SentryTracer } from "./trace/SentryTracer.js";
export { setTracer } from "./trace/index.js";
export * from "./trace/types.js";
export * from "./whip/WhipClient.js";
export * from "./whip/errors.js";
export * from "./whip/types.js";
