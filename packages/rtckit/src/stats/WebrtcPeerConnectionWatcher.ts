import { EventEmitter } from "eventemitter3";

export class WebrtcPeerConnectionWatcher {
  private emitter = new EventEmitter<{
    "peer-connection-created": (pc: RTCPeerConnection) => void;
  }>();

  private origPC: typeof RTCPeerConnection | undefined;

  destroy() {
    this.emitter.removeAllListeners();
    if (this.origPC) {
      (window.RTCPeerConnection as unknown) = this.origPC;
      delete this.origPC;
    }
  }

  init(): void {
    if (window.RTCPeerConnection.name !== "RTCPeerConnection") {
      console.warn(
        "RTCPeerConnection is already replaced with %s, skipping",
        window.RTCPeerConnection.name,
      );
      return;
    }
    const OriginalRTCPeerConnection = window.RTCPeerConnection;
    this.origPC = OriginalRTCPeerConnection;
    const onConnectionCreated = (pc: RTCPeerConnection) => this.handleNewPeerConnection(pc);

    function TestAppRTCPeerConnection(rtcConfig?: RTCConfiguration) {
      const connection = new OriginalRTCPeerConnection(rtcConfig);

      onConnectionCreated(connection);

      return connection;
    }

    (window.RTCPeerConnection as unknown) = TestAppRTCPeerConnection;
    TestAppRTCPeerConnection.prototype = OriginalRTCPeerConnection.prototype;
  }

  subscribe(cb: (pc: RTCPeerConnection) => void) {
    this.emitter.on("peer-connection-created", cb);
  }

  private async handleNewPeerConnection(pc: RTCPeerConnection) {
    this.emitter.emit("peer-connection-created", pc);
  }
}
