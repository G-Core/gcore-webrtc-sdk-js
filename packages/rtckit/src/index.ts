/**
 * Gcore WebRTC Kit
 */

import pkg from "../package.json" with { type: "json" };

/**
 * @public
 */
export const version = pkg.version;

export * from "@gcorevideo/utils"; // TODO export only setTracer after the next minor release
export * from "./MediaDevicesHelper.js";
export * from "./WebrtcStreaming.js";
export * from "./aux/IngesterErrorHandler.js";
export * from "./aux/plugins.js";
export * from "./aux/StreamMeta.js";
export * from "./aux/VideoResolutionChangeDetector.js";
export * from "./errors.js";
export * from "./stats/WebrtcReporter.js";
export * from "./stats/types.js";
export * from "./types.js";
export * from "./userMedia/types.js";
export * from "./whip/WhipClient.js";
export * from "./whip/errors.js";
export * from "./whip/types.js";
