import { PlatformApiService } from "./PlatformApiService.js";
import { LiveStreamDto } from "./types.js";
import { RTSP_PULL_URL, WHEP_ENDPOINT_URL, WHIP_ENDPOINT_URL } from "./settings.js";

type StreamId = number;

export type WebrtcStream = {
  active: boolean;
  id: number;
  playerUrl: string;
  whepEndpoint: string;
  whipEndpoint: string;
};

type CustomOptions = {
  qualitySetId: number | null;
}

export class WebrtcApi {
  private customOptions: CustomOptions = {
    qualitySetId: null,
  };

  constructor(
    private service: PlatformApiService,
  ) {}

  async createStream(
    name: string,
  ): Promise<WebrtcStream> {
    const r = (await this.service.request(
      "streams",
      {
        method: "post",
        data: {
          active: true,
          name,
          pull: false,
          uri: buildWebrtcStreamPullUrl("-", "-"),
          quality_set_id: this.customOptions.qualitySetId,
          transcode_from_pull: true,
        },
      },
    )) as LiveStreamDto;
    await this.service.request(
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
    return this.service.request(
      `streams/${id}`,
      {
        method: "delete",
      },
    );
  }

  async toggleStream(id: StreamId, active: boolean) {
    await this.service.request(
      `streams/${id}`,
      {
        method: "patch",
        data: {
          active,
        },
      },
    )
  }

  setCustomOptions(options: CustomOptions) {
    this.customOptions = options;
  }
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
    playerUrl: r.iframe_url,
    whipEndpoint,
    whepEndpoint,
  };
}
