export interface AuthKey {
  toString(): string;
}

export class BearerToken
  implements AuthKey
{
  constructor(private token: string) {}

  toString(): string {
    return `Bearer ${this.token}`;
  }
}

export class ApiKey implements AuthKey {
  constructor(private key: string) {}

  toString(): string {
    return `APIKey ${this.key}`;
  }
}
