export enum AuthOption {
  Anonymous = "anonymous",
  Token = "token",
  SSO = "sso",
}

export type ChatAuthTokenEntity = {
  chatAuthToken: string;
};

export enum ApiErrorCodes {
  BroadcasterError = 301,
}

export enum PincodeErrorCodes {
  PincodeInvalid = 201,
  PincodeRequired,
  PincodeNotMatchRoom,
}

export enum PinCodeStatus {
  Pending = "pending",
  Input = "input",
  ReInput = "re-input",
  Checked = "checked",
}

export enum ChatSaveMode {
  Delete = "Delete",
  Temporary = "Temporary",
  Forever = "Forever",
}

type UiCustomizationOptions = {
  customLayers?: Record<string, number>;
  showLogo?: boolean;
};

export type UiConfig = {
  authOptions: AuthOption[];
  options: UiCustomizationOptions;
};

export type ExtendedUiConfig = UiConfig & {
  clientId: number; // TODO remove
  chatOptions: {
    fileUploadOptions: Record<string, unknown>;
    parseServerOptions: { appId: string; serverURL: string };
  };
  chatSaveMode: ChatSaveMode;
};

export type SessionConfig = {
  iceServers: Array<RTCIceServer>;
  server: string;
  token: string;
  chatSaveMode: ChatSaveMode;
};

export type SessionInitParams = {
  hostname: string;
  roomId: string;
  webinar?: boolean;
  isParticipant?: boolean;
  peerId?: string;
  token?: string;
  pincode?: string;
  retryDuration?: number; // ms
};

export interface StreamEntity {
  id: number | null;
}

export interface CheckStreamEntity extends StreamEntity {
  recordingStatus: boolean;
  startRecordingTime: number;
}
