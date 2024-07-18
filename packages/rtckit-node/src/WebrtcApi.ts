import { PlatformApiService } from "./PlatformApiService.js";
import { LiveStreamDto } from "./types.js";
import { logger } from "./logger.js";
import { RTSP_PULL_URL, WHEP_ENDPOINT_URL, WHIP_ENDPOINT_URL } from "./settings.js";

export type WebrtcStream = {
  id: number;
  active: boolean;
  whepEndpoint: string;
  whipEndpoint: string;
};

const QUALITY_SET_ID = 675;

export class WebrtcApi {
  constructor(
    private api: PlatformApiService,
  ) {}

  async createStream(
    name: string,
  ): Promise<WebrtcStream> {
    const r = (await this.api.request(
      "streams",
      {
        method: "post",
        data: {
          name,
          active: true,
          pull: true,
          uri: buildWebrtcStreamPullUrl("-", "-"),
          quality_set_id: QUALITY_SET_ID,
        },
      },
    )) as LiveStreamDto;
    logger.debug("Created a stream: %o", r);
    await this.api.request(
      `streams/${r.id}`,
      {
        method: "patch",
        data: {
          uri: buildWebrtcStreamPullUrl(
            String(r.id),
            r.token,
          ),
        },
      },
    );
    return toWebrtcStream(r);
  }

  async deleteStream(
    id: number,
  ): Promise<void> {
    return this.api.request(
      `streams/${id}`,
      {
        method: "delete",
      },
    );
  }

  // TODO switch off webrtc
}

function buildWebrtcStreamPullUrl(
  streamId: string,
  token: string,
): string {
  return putUrlSlugs(RTSP_PULL_URL, streamId, token);
}

function putUrlSlugs(tpl: string, streamId: string, token: string): string {
  return tpl.replace('{stream_id}', streamId).replace('{token}', token);
}

function buildWebrtcEndpointUrls(
  streamId: string,
  token: string
): [string, string] {
  return [
    putUrlSlugs(WHIP_ENDPOINT_URL, streamId, token),
    putUrlSlugs(WHEP_ENDPOINT_URL, streamId, token),
  ];
}

function toWebrtcStream(
  r: LiveStreamDto,
): WebrtcStream {
  const [whipEndpoint, whepEndpoint] =
    buildWebrtcEndpointUrls(String(r.id), r.token);
  return {
    id: r.id,
    active: r.active,
    whipEndpoint,
    whepEndpoint,
  };
}
