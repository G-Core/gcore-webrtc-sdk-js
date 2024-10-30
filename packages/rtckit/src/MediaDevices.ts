type VideoResolution = {
  width: number;
  height: number;
}

const VIDEORES: Record<
  string,
  VideoResolution
> = {
  '1080': {
    width: 1920,
    height: 1080,
  },
  '720': {
    width: 1280,
    height: 720,
  },
  '480': {
    width: 854,
    height: 480,
  },
  '360': {
    width: 640,
    height: 360,
  },
  '240': {
    width: 426,
    height: 240,
  },
}

const MAX_RESOLUTION = VIDEORES['1080']

/**
 * A wrapper around browser's `navigator.mediaDevices` to simplify getting access to the devices
 * @public
 */
export class MediaDevicesHelper {
  private devices: MediaDeviceInfo[] = [];

  private hasVideoResolutions = false;
  private videoResolutions: Record<string, VideoResolution[]> = {};

  private enumerateDevices = new NoCollisions(() => navigator.mediaDevices.enumerateDevices())

  getAvailableVideoResolutions(deviceId: string): VideoResolution[] {
    return this.videoResolutions[deviceId] || [];
  }

  async getCameras(): Promise<MediaDeviceInfo[]> {
    if (!this.devices.length) {
      await this.updateDevices();
    }
    if (!this.hasVideoResolutions) {
      await this.updateVideoResolutions();
    }
    return this.devices.filter((devInfo) => devInfo.kind === "videoinput");
  }

  async getMicrophones(): Promise<MediaDeviceInfo[]> {
    if (!this.devices.length) {
      await this.updateDevices();
    }
    return this.devices.filter((devInfo) => devInfo.kind === "audioinput");
  }

  reset() {
    this.devices = [];
  }

  static async probeAvailableVideoResolutions(deviceId: string): Promise<VideoResolution[]> {
    const result: VideoResolution[] = [];
    for (const res of Object.values(VIDEORES)) { // entries are sorted in ascending order of keys
      await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: {
            exact: deviceId,
          },
          width: { exact: res.width },
          height: { exact: res.height },
        },
      }).then((s) => {
        result.push({
          width: res.width,
          height: res.height,
        });
        s.getTracks().forEach((t) => {
          t.stop();
          s.removeTrack(t);
        });
      }, () => {
        // TODO check error, it can be NotReadableError
      });
    }
    return result.reverse(); // return in descending order of resolution
  }

  static parseVideoResolution(resolution: number): { width: number; height: number } | undefined {
    if (resolution in VIDEORES) {
      return VIDEORES[resolution];
    }
  }

  private async updateDevices() {
    return navigator.mediaDevices.getUserMedia({
      video: {
        width: MAX_RESOLUTION.width,
        height: MAX_RESOLUTION.height,
      },
    }).then(s => {
      return this.enumerateDevices
        .run()
        .then((devices) => devices.filter(({ deviceId }) => !!deviceId))
        .then((devices) => {
          this.devices = devices;
        })
        .finally(() => {
          s.getTracks().forEach((t) => {
            t.stop();
            s.removeTrack(t);
          });
        })
    })
  }

  private async updateVideoResolutions() {
    for await (const device of this.devices) {
      if (device.kind === "videoinput") {
        this.videoResolutions[device.deviceId] = await MediaDevicesHelper.probeAvailableVideoResolutions(device.deviceId);
      }
    }
    this.hasVideoResolutions = true;
  }
}

class NoCollisions<T> {
  private promise: Promise<T> | null = null;

  constructor(private fn: () => Promise<T>) {}

  run(): Promise<T> {
    if (!this.promise) {
      this.promise = this.fn().finally(() => {
        this.promise = null;
      });
    }
    return this.promise;
  }
}
