import { PlatformApiService } from "./PlatformApiService.js";
import { LiveStreamDto } from "./types.js";

type StreamId = number;

export type WebrtcStream = {
  active: boolean;
  id: number;
  playerUrl: string;
  whepEndpoint: string;
  whipEndpoint: string;
};

type CustomOptions = {}

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

function toWebrtcStream(
  r: LiveStreamDto,
): WebrtcStream {
  return {
    active: r.active,
    id: r.id,
    playerUrl: r.iframe_url,
    whepEndpoint: "",
    whipEndpoint: r.push_url_whip,
  };
}
