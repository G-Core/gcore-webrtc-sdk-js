import { WhipClientPluginBase } from "./plugins.js";
import { ServerRequestError } from "../errors.js";
import { IngesterErrorDetail } from "../helpers/fetch.js";
import type { WhipClientPlugin } from "../whip/types.js";

/**
 * The reason of the ingester request failure
 *
 * @beta
 */
export enum IngesterErrorReason {
  StreamNotExists = 2001,
  StreamTokenInvalid = 2002,
  DuplicateStream = 2003,
  StreamDeactivated = 2004,
}

/**
 * @beta
 */
export interface IngesterError {
  detail: {
    reasonCode: IngesterErrorReason;
  };
  name: "ServerRequestError";
  message: string;
}

/**
 * @beta
 */
export class IngesterErrorHandler extends WhipClientPluginBase implements WhipClientPlugin {
  constructor(private handler: (reason: IngesterErrorReason) => void) {
    super();
  }

  public requestError(_: URL, options: RequestInit, error: Error) {
    if (options.method === "POST" && IngesterErrorHandler.isIngesterError(error)) {
      this.handler((error.detail as IngesterErrorDetail).reasonCode as IngesterErrorReason);
    }
  }

  static isIngesterError(e: Error): e is IngesterError {
    return !!(e instanceof ServerRequestError && e.detail && (e.detail as IngesterErrorDetail).reasonCode);
  }
}
