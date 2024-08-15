// Based on https://github.com/medooze/whip-whep-js/blob/main/whip.js
import { EventEmitter } from "eventemitter3";

import { reportError, trace } from "../trace/index.js";
import { restrictCodecs } from "./utils.js";
import { WhipClientOptions } from "./types.js";
import {
  ConflictError,
  AssertionError,
  ServerRequestError,
  TimeoutError,
  MalformedResponseError,
} from "../errors.js";
import { ReconnectAttemptsExceededError, SessionClosedError } from "./errors.js";
import { handleFetchResponse, withRetries } from "../helpers/fetch.js";

const T = "WhipClient";

const ICE_CANDIDATES_WAIT_TIME = 5000;

/**
 * @example client.on(WhipClientEvents.Dicsonnected, () =\> showError(__('Reconnecting...')));
 * @public
 */
export enum WhipClientEvents {
  /**
   * The client has successfully connected, probabaly after an ICE restart or a full session restart
   */
  Connected = "connected",
  /**
   * Initial connect or reconnect has failed after a series of retries
   */
  ConnectionFailed = "connection_failed",
  /**
   * The client abruptly disconnected and will try to reconnect
   */
  Disconnected = "disconnected",
}

/** Event name =\> arguments mapping
 * @public
 */
export type WhipClientEventTypes = {
  [WhipClientEvents.Connected]: [];
  [WhipClientEvents.Disconnected]: [];
  [WhipClientEvents.ConnectionFailed]: [];
};

/**
 * WHIP client for streaming with WebRTC from a browser
 * @public
 */
export class WhipClient {
  private emitter = new EventEmitter<WhipClientEvents>();

  private closed = false;

  private iceUsername: string | null = null;

  private icePassword: string | null = null;

  private iceServers: RTCIceServer[] = [];

  private candidates: RTCIceCandidate[] = [];

  private eofCandidates = false;

  private cbResolveCandidates: (() => void) | null = null;

  private trickleIceTimer: number | null = null;

  private pc: RTCPeerConnection | null = null;

  private canRestartIce = false;

  private canTrickleIce = false;

  private resourceUrl: URL | null = null;

  private etag: string | null = null;

  private iceRestartTs: number = 0;

  private mediaStream: MediaStream | null = null;

  private reconnects = 0;

  constructor(private endpoint: string, private options?: WhipClientOptions) {
    if (options?.canTrickleIce) {
      this.canTrickleIce = true;
    }
    if (options?.canRestartIce) {
      this.canRestartIce = true;
    }
    if (options?.iceServers) {
      this.iceServers = options.iceServers;
    }
  }

  async close() {
    this.closed = true;

    this.clearIceTrickTimeout();

    await this.closeSession();

    this.mediaStream = null;
  }

  async start(mediaStream: MediaStream) {
    if (this.pc) {
      throw new ConflictError("Already publishing");
    }

    if (this.closed) {
      throw new ConflictError("Client is closed");
    }

    this.mediaStream = mediaStream;

    await this.runPreflight();

    await this.runStart(mediaStream);
  }

  on<E extends WhipClientEvents>(
    event: E,
    listener: EventEmitter.EventListener<WhipClientEventTypes, E>,
  ) {
    this.emitter.on(event, listener);
  }

  /**
   * Made public for testing purposes
   */
  async restart() {
    if (this.closed) {
      trace(`${T} restart: client is closed`);
      return;
    }
    trace(`${T} restart`);

    const pc = this.pc;
    if (!pc) {
      throw new AssertionError("No peer connection");
    }

    trace(`${T} restart`, {
      reconnects: this.reconnects,
      maxReconnects: this.options?.maxReconnects,
    });
    if (this.options?.maxReconnects && this.reconnects >= this.options.maxReconnects) {
      throw new ReconnectAttemptsExceededError();
    }
    this.reconnects++;

    this.clearIceTrickTimeout();
    this.resetCandidates();

    if (!this.canRestartIce) {
      trace(`${T} server doesn't support ICE restart`);
      return await this.fullRestart();
    }

    pc.restartIce();

    const offer = await pc.createOffer({ iceRestart: true });
    this.updateIceParams(offer.sdp!);

    await pc.setLocalDescription(offer);

    this.iceRestartTs = new Date().getTime();

    this.clearIceTrickTimeout();

    try {
      await this.patch();
    } catch (e) {
      if (e instanceof SessionClosedError) {
        await this.fullRestart();
        return;
      }
      if (e instanceof ServerRequestError && e.status === 405) {
        await this.fullRestart();
        return;
      }
      throw e;
    }
  }

  private async closeSession() {
    trace(`${T} closeSession`);
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    if (this.resourceUrl) {
      await this.fetch(this.resourceUrl, "DELETE").catch((e) => {
        reportError(e);
      });
      this.resourceUrl = null;
    }
  }

  private async runStart(stream: MediaStream) {
    trace(`${T} runStart`, this.options);
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    this.pc = pc;

    this.pc.onconnectionstatechange = () => {
      trace(`${T} onconnectionstatechange`, {
        connectionState: pc.connectionState,
      });
      switch (pc.connectionState) {
        case "connected":
          // The connection has become fully connected
          this.connected();
          break;
        case "disconnected":
          this.disconnected();
          break; // TODO
        case "failed":
          this.disconnected();
          // One or more transports has terminated with an error
          // TODO set randomized delay
          this.restart().catch((e) => {
            reportError(e);
            this.connectionFailed();
          });
          break;
        case "closed":
          // The connection has been closed
          break;
      }
    };

    this.pc.onicecandidate = (event) => {
      trace(`${T} onicecandidate`, {
        candidate: event.candidate?.candidate,
        eol: !event.candidate,
        mline: event.candidate?.sdpMLineIndex,
      });
      if (event.candidate) {
        // Ignore candidates not from the first m line
        if (event.candidate.sdpMLineIndex) {
          return;
        }
        this.candidates.push(event.candidate);
      } else {
        this.eofCandidates = true;
      }
      if (this.canResolveWaitCandidates()) {
        this.resolveCandidatesPromise();
      }
      if (this.canTrickleIce && !this.trickleIceTimer && !this.iceRestartTs) {
        // TODO trickle srflx/relay/prflx candidates immediately, host candidates after a delay
        this.trickleIceTimer = window.setTimeout(() => this.runTrickleIce(), 0);
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    if (!this.canTrickleIce) {
      await this.waitIceCandidates();
    }

    await this.runInit(pc);
  }

  private waitIceCandidates(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.canResolveWaitCandidates()) {
        return resolve();
      }
      this.cbResolveCandidates = resolve;
      setTimeout(
        () => reject(new TimeoutError("Timeout waiting for ICE candidates")),
        ICE_CANDIDATES_WAIT_TIME,
      );
    });
  }

  private async fullRestart() {
    if (this.closed) {
      trace(`${T} fullRestart: client is closed`);
      return;
    }
    trace(`${T} fullRestart`);

    if (!this.mediaStream) {
      throw new AssertionError("No media stream");
    }
    await this.closeSession();
    await this.runStart(this.mediaStream);
  }

  private canResolveWaitCandidates() {
    return this.candidates.some((c) => this.options?.useHostIceCandidates || c.type !== "host");
  }

  private async runInit(pc: RTCPeerConnection) {
    const headers = { "content-type": "application/sdp" };

    const sdp = pc.localDescription?.sdp;
    if (!sdp) {
      throw new AssertionError("No local description");
    }

    const resp = await this.fetch(this.endpoint, "POST", headers, this.mungeOffer(sdp));
    const loc = resp.headers.get("location");
    if (!loc) {
      throw new MalformedResponseError("Response missing location header");
    }

    this.resourceUrl = new URL(loc, this.endpoint);

    this.checkAllowedMethods(resp);
    this.getIceServers(resp);

    const config = pc.getConfiguration();

    // If it has ice server info and it is not overriden by the client
    if (!(config.iceServers && config.iceServers.length) && this.iceServers.length) {
      config.iceServers = this.iceServers;

      if (config.iceServers.length)
        //Set it
        pc.setConfiguration(config);
    }

    const answer = await resp.text();

    this.etag = resp.headers.get("etag");

    // if (this.canTrickleIce && !this.trickleIceTimer) {
    //   this.trickleIceTimer = window.setTimeout(() => this.runTrickleIce(), 0);
    // }

    // TODO: chrome is returning a wrong value, so don't use it for now
    //try {
    //	//Get local ice properties
    //	const local = this.pc.getTransceivers()[0].sender.transport.iceTransport.getLocalParameters();
    //	//Get them for transport
    //	this.iceUsername = local.usernameFragment;
    //	this.icePassword = local.password;
    //} catch (e) {
    //Fallback for browsers not supporting ice transport
    this.updateIceParams(sdp);
    //}

    await pc.setRemoteDescription({ type: "answer", sdp: answer });
  }

  private clearIceTrickTimeout() {
    if (this.trickleIceTimer) {
      window.clearTimeout(this.trickleIceTimer);
      this.trickleIceTimer = null;
    }
  }

  // TODO rename
  private async patch() {
    this.clearIceTrickTimeout();

    if (!this.pc) {
      trace(`${T} patch: no peer connection`);
      return;
    }

    if (this.closed) {
      trace(`${T} patch: client is closed`);
      return;
    }

    const pc = this.pc;

    if (!(this.candidates.length || this.eofCandidates || this.iceRestartTs) || !this.resourceUrl) {
      return;
    }

    const candidates = this.candidates;
    const endOfcandidates = this.eofCandidates;
    const restartIce = this.iceRestartTs;

    // Clean pending data before async operation
    this.candidates = [];

    let fragment =
      "a=ice-ufrag:" + this.iceUsername + "\r\n" + "a=ice-pwd:" + this.icePassword + "\r\n";
    const transceivers = pc.getTransceivers();
    const medias: Record<
      string,
      { mid: string; kind: "video" | "audio"; candidates: RTCIceCandidate[] }
    > = {};
    if (!transceivers.length) {
      throw new AssertionError("No transceivers found");
    }
    if (!transceivers[0].mid) {
      throw new AssertionError("Default mid is not set");
    }
    if (candidates.length || endOfcandidates) {
      // Create media object for first media always
      medias[transceivers[0].mid] = {
        mid: transceivers[0].mid,
        kind: transceivers[0].receiver.track.kind as "video" | "audio",
        candidates: [],
      };
    }
    for (const candidate of candidates) {
      const mid = candidate.sdpMid;
      if (mid === null) {
        trace(`${T} candidate doesn't have mid set ${candidate.candidate}`);
        continue;
      }
      const transceiver = transceivers.find((t) => t.mid === mid);
      if (!transceiver) {
        trace(`${T} no transceiver found for mid=${mid}`);
        continue;
      }
      let media = medias[mid];
      if (!media) {
        media = medias[mid] = {
          mid,
          kind: transceiver.receiver.track.kind as "video" | "audio",
          candidates: [],
        };
      }
      media.candidates.push(candidate);
    }
    for (const media of Object.values(medias)) {
      fragment += "m=" + media.kind + " 9 UDP/TLS/RTP/SAVPF 0\r\n" + "a=mid:" + media.mid + "\r\n";
      for (const candidate of media.candidates) {
        fragment += "a=" + candidate.candidate + "\r\n";
      }
      if (endOfcandidates) {
        fragment += "a=end-of-candidates\r\n";
      }
    }

    const headers: Record<string, string> = { "content-type": "application/trickle-ice-sdpfrag" };

    if (restartIce) {
      headers["if-match"] = "*";
    } else if (this.etag) {
      headers["if-match"] = this.etag;
    }

    try {
      const fetched = await this.fetch(this.resourceUrl, "PATCH", headers, fragment);
      if (restartIce && fetched.status === 200) {
        this.etag = fetched.headers.get("etag");

        const answer = await fetched.text();
        const [iceUsername, icePassword] = matchIceParams(answer);
        const candidates = Array.from(answer.matchAll(/(a=candidate:.*\r\n)/gm)).map(
          (res: string[]) => res[1],
        );

        const remoteDescription = pc.remoteDescription?.sdp;

        if (!remoteDescription) {
          throw new AssertionError("No remote description");
        }
        const newRemoteDescription = remoteDescription
          .replaceAll(/(a=ice-ufrag:)(.*)\r\n/gm, "$1" + iceUsername + "\r\n")
          .replaceAll(/(a=ice-pwd:)(.*)\r\n/gm, "$1" + icePassword + "\r\n")
          .replaceAll(/(a=candidate:.*\r\n)/gm, "")
          .replaceAll(/(m=.*\r\n)/gm, "$1" + candidates.join(""));

        await pc.setRemoteDescription({
          type: "answer",
          sdp: newRemoteDescription,
        });

        // If we are still the last ice restart
        if (this.iceRestartTs === restartIce) {
          this.iceRestartTs = 0;
          if ((this.candidates.length || this.eofCandidates) && this.canTrickleIce) {
            // Trickle again
            this.runTrickleIce();
          }
        }
      }
    } catch (e) {
      reportError(e);
      if (e instanceof ServerRequestError) {
        if (e.status === 404) {
          // TODO check with MediaMTX
          this.resourceUrl = null;
          throw new SessionClosedError();
        }
      }
      throw e;
    } finally {
      this.iceRestartTs = 0;
    }
  }

  private fetch(
    url: string | URL,
    method: string,
    headers: Record<string, string> = {},
    body?: string,
  ): Promise<Response> {
    // TODO retry on: domain resolution error, timeout error, 502, 503, 504
    return withRetries(
      () =>
        fetch(url, {
          method,
          headers: { ...this.getCommonHeaders(), ...headers },
          body,
        }),
      this.options?.maxWhipRetries,
    ).then(
      (resp: Response) => handleFetchResponse(resp),
      (e) => {
        trace(`${T} fetch ${method} ${url} failed ${e}`);
        return Promise.reject(e);
      },
    );
  }

  private getCommonHeaders(): Record<string, string> {
    if (this.options?.auth) {
      return {
        authorization: `Beader ${this.options.auth}`,
      };
    }
    return {};
  }

  private getIceServers(fetched: Response) {
    if (this.iceServers.length) {
      return;
    }
    const links = getLinks(fetched);
    if (links["ice-server"]) {
      this.iceServers = links["ice-server"]
        .map((link) => {
          const urls = [link.url];
          if (link.url.startsWith("stun:")) {
            return {
              urls,
            };
          } else {
            if (
              link.params["username"] &&
              link.params["credential"] &&
              link.params["credential-type"] === "password"
            ) {
              return {
                urls,
                username: link.params["username"],
                credential: link.params["credential"],
              };
            }
          }
        })
        .filter((s) => s) as RTCIceServer[];
    }
  }

  private mungeOffer(sdp: string): string {
    const s1 = sdp.replace(/a=sendrecv/g, "a=sendonly");
    if (this.options?.videoCodecs?.length) {
      return restrictCodecs(s1, "video", this.options.videoCodecs);
    }
    return s1;
  }

  private updateIceParams(offerSdp: string) {
    const iceu = offerSdp.match(/a=ice-ufrag:(.*)\r\n/);
    this.iceUsername = iceu ? iceu[1] : null;
    const icep = offerSdp.match(/a=ice-pwd:(.*)\r\n/);
    this.icePassword = icep ? icep[1] : null;
  }

  private async runPreflight() {
    // TODO don't run unnecessarily, i.e., when ICE servers and other options are known
    if (!this.needPreflight()) {
      trace(`${T} runPreflight skipping`);
      return;
    }
    try {
      const resp = await this.fetch(this.endpoint, "OPTIONS");
      this.checkAllowedMethods(resp);
      this.getIceServers(resp);
    } catch (e) {
      trace(`${T} runPreflight failed ${e}`, {
        endpoint: this.endpoint,
      });
    }
  }

  private needPreflight() {
    if (isLocalhost(this.endpoint)) {
      return false;
    }
    return (
      !this.options ||
      !this.options.iceServers?.length ||
      (
        this.options.canRestartIce === undefined &&
        this.options.canTrickleIce === undefined
      )
    );
  }

  private checkAllowedMethods(resp: Response) {
    // This seems not to have much support on the media servers
    const allow =
      resp.headers.get("allow") || resp.headers.get("access-control-allow-methods") || "";
    const methods = allow.split(",").map((s) => s.trim());
    if (methods.includes("PATCH")) {
      this.canTrickleIce = true;
      this.canRestartIce = true;
    }
  }

  private resetCandidates() {
    this.candidates = [];
    this.eofCandidates = false;
    this.cbResolveCandidates = null;
  }

  private resolveCandidatesPromise() {
    if (this.cbResolveCandidates) {
      const cb = this.cbResolveCandidates;
      this.cbResolveCandidates = null;
      setTimeout(cb, 0);
    }
  }

  private async runTrickleIce() {
    try {
      await this.patch();
    } catch (e) {
      if (e instanceof ServerRequestError) {
        return;
      }
      throw e;
    }
  }

  private disconnected() {
    trace(`${T} disconnected`);
    this.emitter.emit(WhipClientEvents.Disconnected);
  }

  private connected() {
    this.reconnects = 0;
    this.emitter.emit(WhipClientEvents.Connected);
  }

  private connectionFailed() {
    trace(`${T} connectionFailed`);
    this.emitter.emit(WhipClientEvents.ConnectionFailed);
  }
}

type ResourceLinks = Record<string, ResourceLinkData[]>;
type ResourceLinkData = {
  url: string;
  params: Record<string, string>;
};

function getLinks(response: Response): ResourceLinks {
  const links: ResourceLinks = {};

  const linkHeadersRaw = response.headers.get("link");
  if (linkHeadersRaw) {
    const linkHeaders = linkHeadersRaw.split(/,\s+(?=<)/);
    for (const header of linkHeaders) {
      try {
        let rel: string | undefined,
          params: Record<string, string> = {};
        const items = header.split(";");
        const url = (items.shift() as string)
          .trim()
          .replace(/<(.*)>/, "$1")
          .trim();
        for (const item of items) {
          const subitems = item.split(/=(.*)/);
          const key = subitems[0].trim();
          const value = subitems[1]
            ? subitems[1].trim().replaceAll('"', "").replaceAll("'", "")
            : subitems[1];
          if (key === "rel") {
            rel = value;
          } else {
            params[key] = value;
          }
        }
        if (!rel) {
          continue;
        }
        if (!links[rel]) {
          links[rel] = [];
        }
        links[rel].push({ url, params });
      } catch (e) {
        reportError(e);
        console.error(e);
      }
    }
  }
  return links;
}

function matchIceParams(sdp: string): [string, string] {
  const iceu = sdp.match(/a=ice-ufrag:(.*)\r\n/);
  const icep = sdp.match(/a=ice-pwd:(.*)\r\n/);
  return [iceu ? iceu[1] : "", icep ? icep[1] : ""];
}

function isLocalhost(endpoint: string) {
  return new URL(endpoint).hostname === "localhost";
}
