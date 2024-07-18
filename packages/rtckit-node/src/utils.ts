import { ApiKey, AuthKey, BearerToken } from "./auth.js";

export function parseAuth(
  auth: string,
): AuthKey {
  const parts = auth.split(" ");
  if (parts.length !== 2) {
    throw new Error(
      "Invalid AUTH environment variable",
    );
  }
  const schema = parts[0].toLowerCase();
  validateAuthSchema(schema);
  switch (schema) {
    case "apikey":
      return new ApiKey(parts[1]);
    case "bearer":
      return new BearerToken(parts[1]);
  }
}

function validateAuthSchema(
  schema: string,
): asserts schema is
  | "apikey"
  | "bearer" {
  switch (schema) {
    case "apikey":
    case "bearer":
      return;
    default:
      throw new UnsupportedAuthSchemaError(
        schema,
      );
  }
}

class UnsupportedAuthSchemaError extends Error {
  constructor(schema: string) {
    super(
      `Unsupported auth schema: ${schema}`,
    );
  }
}
