export interface AuthKey {
  header: string;
}

export class AuthHeader implements AuthKey {
  constructor(private secret: string, private schema: string) {}

  get header(): string {
    return `${this.schema} ${this.secret}`;
  }

  toString() {
    return this.header;
  }
}

export class BearerToken extends AuthHeader{
  constructor(token: string) {
    super(token, "Bearer");
  }
}

export class ApiKey extends AuthHeader {
  constructor(token: string) {
    super(token, "APIKey");
  }
}
