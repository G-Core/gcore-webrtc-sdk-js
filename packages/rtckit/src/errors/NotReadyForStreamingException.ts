export class NotReadyForStreamingException extends Error {
  constructor() {
    super("Not ready for streaming");
    this.name = "NotReadyForStreamingException";
  }
}
