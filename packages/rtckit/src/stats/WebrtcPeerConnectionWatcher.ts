import EventLite from "event-lite";

export class WebrtcPeerConnectionWatcher {
  private emitter = new EventLite();

  private origPC: typeof RTCPeerConnection | undefined;

  destroy() {
    // @ts-ignore - typings are wrong about optionality of the arguments
    this.emitter.off();
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
