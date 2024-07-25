export type ErrorDetails = {
  errors?: string[];
};

// Broadcaster or other Platform API error, status and details are forwarded as is
export class GcoreApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly details?: ErrorDetails,
  ) {
    const more = details?.errors
      ? `; ${details.errors.join(", ")}`
      : "";
    super(`Status ${status}${more}`);
    this.name = "GcoreApiError";
  }
}

// an API method returned unexpected response
export class MalformedApiResponseError extends Error {
  constructor(expected: string) {
    super(expected);
    this.name =
      "MalformedApiResponseError";
  }
}
