import { PlatformApiService } from "./PlatformApiService.js";
import { LiveStreamDto } from "./types.js";
import { WHEP_ENDPOINT_URL, WHIP_ENDPOINT_URL } from "./settings.js";

type StreamId = number;

export type WebrtcStream = {
  active: boolean;
  id: number;
  playerUrl: string;
  whepEndpoint: string;
  whipEndpoint: string;
};

type CustomOptions = {
  qualitySetId?: number;
}

export class WebrtcApi {
  private customOptions: CustomOptions = {};

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
        },
      },
    )) as LiveStreamDto;
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
