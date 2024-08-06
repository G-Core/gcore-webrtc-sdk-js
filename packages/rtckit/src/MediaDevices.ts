const VIDEORES: Record<
  string,
  { width: number; height: number }
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

/**
 * A wrapper around browser's `navigator.mediaDevices` to simplify getting access to the devices
 * @public
 */
export class MediaDevices {
  private devices: MediaDeviceInfo[] = [];

  async getCameras(): Promise<MediaDeviceInfo[]> {
    if (!this.devices.length) {
      await this.updateDevices();
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

  static parseVideoResolution(resolution: number): { width: number; height: number } | undefined {
    if (resolution in VIDEORES) {
      return VIDEORES[resolution];
    }
  }

  private async updateDevices() {
    await navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => devices.filter(({ deviceId }) => !!deviceId))
      .then((devices) => {
        this.devices = devices;
      });
  }
}
