import { Client, addBreadcrumb } from "@sentry/core";

/**
 * @beta
 */
export class SentryTracer {
  constructor(private client: Client) {}

  reportError(e: Error) {
    this.client.captureException(e);
  }

  trace(message: string, data?: Record<string, unknown>) {
    addBreadcrumb({
      type: "default",
      level: "info",
      message,
      data,
    });
  }
};
