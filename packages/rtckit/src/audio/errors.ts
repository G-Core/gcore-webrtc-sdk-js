export class AudioContextNotReadyError extends Error {
  constructor() {
    super("Audio context is not ready");
    this.name = "AudioContextNotReadyError";
  }
}

export class AudioControllerError extends Error {
  constructor(error: unknown) {
    super(String(error));
    this.name = "AudioControllerError";
  }
}

export class AudioControllerHookError extends Error {
  constructor(error: unknown) {
    super(String(error));
    this.name = "AudioControllerHookError";
  }
}

export class AudioOutputNotAttachedError extends Error {
  constructor() {
    super("Audio output is not attached");
    this.name = "AudioOutputNotAttachedError";
  }
}

export class AudioOutputSelectionUnsupportedError extends Error {
  constructor() {
    super("Audio output selection is not supported");
    this.name = "AudioOutputSelectionUnsupportedError";
  }
}

export class AudioControllerStartFailedError extends Error {
  constructor(error: unknown) {
    super(String(error));
    this.name = "AudioControllerStartFailedError";
  }
}
