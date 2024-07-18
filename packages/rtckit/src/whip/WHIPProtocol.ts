// https://github.com/Eyevinn/whip/blob/main/packages/sdk/src/WHIPProtocol.ts

export class WHIPProtocol {
  sendOffer(url: string, authKey: string | undefined, sdp: string): Promise<Response> {
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/sdp",
        Authorization: authKey,
      } as HeadersInit,
      body: sdp,
    });
  }

  getConfiguration(url: string, authKey: string | undefined): Promise<Response> {
    return fetch(url, {
      method: "OPTIONS",
      headers: {
        Authorization: authKey,
      } as HeadersInit,
    });
  }

  delete(url: string): Promise<Response> {
    return fetch(url, {
      method: "DELETE",
    });
  }

  updateIce(url: string, eTag: string, sdp: string): Promise<Response> {
    return fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/trickle-ice-sdpfrag",
        ETag: eTag,
      },
      body: sdp,
    });
  }
}
