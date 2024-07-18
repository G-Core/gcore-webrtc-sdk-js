export type ErrorDetails = {
  errors?: string[];
};

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

export class MalformedApiResponseError extends Error {
  constructor(expected: string) {
    super(expected);
    this.name =
      "MalformedApiResponseError";
  }
}
