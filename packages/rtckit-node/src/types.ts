export type LiveStreamDto = {
  active: boolean;
  id: number;
  iframe_url: string;
  live: boolean;
  name: string;
  pull: boolean;
  push_url_whip: string;
  token: string;
  uri: string;
  dash_url: string | null;
  hls_cmaf_url: string | null;
  hls_mpegts_url: string | null;
};
