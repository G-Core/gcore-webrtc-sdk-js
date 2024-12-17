import { MediaKind } from "src/types";

/**
 * @public
 */
export type DeviceId = string;

/**
 * @public
 */
export type WebrtcStreamParams = {
  audio?: boolean | DeviceId;
  video?: boolean | DeviceId;
  resolution?: number;
};

/**
 * @beta
 */
export interface SourceStreamControlProtocol {
  openSourceStreamSuccess(stream: MediaStream): void;
  openSourceStreamError(e: Error, constraints: MediaStreamConstraints): Promise<MediaStream>;
  reconnectDevices(kinds: Array<MediaKind>, streamParams: WebrtcStreamParams): Promise<MediaStream>;

  close(): void;
  connect(c: SourceStreamControlProtocolConnector): void;
}

/**
 * @beta
 */
export interface SourceStreamControlProtocolConnector {
  closeStream(): Promise<void>;
  openStream(params: WebrtcStreamParams): Promise<MediaStream>;
  updateDevicesList(): Promise<void>;
}
