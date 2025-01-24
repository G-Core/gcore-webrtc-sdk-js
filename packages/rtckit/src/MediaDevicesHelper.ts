import { reportError, trace } from "@gcorevideo/utils";

/**
 * @public
 */
export type VideoResolution = {
  width: number;
  height: number;
}

/**
 * Standard video resolutions
 * @public
 */
export const STD_VIDEORES: Record<
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

/**
 * @public
 */
export class VideoResolutionProbeError extends Error {
  constructor(public readonly width: number, public readonly height: number, public readonly deviceId: string, e: Error) {
    const vres = width && height ? `${width}x${height}` : (
      width
        ? `${width}x-?`
        : (
          height ? `-x${height}` : "?"
        )
    );
    const msg = `${e.name}: ${e.message}${e.name === "OverconstrainedError" ? ` ${(e as any).constraint}` : ''}`;
    super(`Video resolution (${vres}) probe failed (device ${deviceId}): ${msg}`);
    this.name = "VideoResolutionProbeError";
  }
}

const T = "MediaDevicesHelper";

/**
 * Information about a media input device.
 * It's implicit type is inferred from the method by which it is obtained,
 * e.g., {@link MediaDevicesHelper.getCameras}
 * @public
 * TODO rename
 */
export type MediaInputDeviceInfo = {
  deviceId: string;
  groupId: string;
  label: string;
}

/**
 * A wrapper around browser's `navigator.mediaDevices` to simplify getting access to the devices
 * @public
 */
export class MediaDevicesHelper {
  private devices: MediaDeviceInfo[] = [];

  private videoResolutions: Record<string, VideoResolution[]> = {};

  private enumerateDevices = new NoCollisions(() => navigator.mediaDevices.enumerateDevices())

  /**
   * Get a list of available video resolutions supported by the device
   *
   * A video resolution is probed for the given device, using the list of standard resolutions
   *   {@link STD_VIDEORES}
   *
   * @param deviceId - ID of the camera device from
   *   {@link MediaDevicesHelper.getCameras}
   */
  getAvailableVideoResolutions(deviceId: string): VideoResolution[] {
    return this.videoResolutions[deviceId] || [];
  }

  /**
   * Get a list of the camera devices available
   */
  async getCameras(): Promise<MediaInputDeviceInfo[]> {
    trace(`${T} getCameras`, { devices: this.devices.length });
    if (!this.devices.length) {
      await this.updateDevices.run();
    }
    await this.updateVideoResolutions.run();
    return filterDevicesList(this.devices, "videoinput");
  }

  /**
   * Get a list of the microphone devices available
   */
  async getMicrophones(): Promise<MediaInputDeviceInfo[]> {
    trace(`${T} getMicrophones`, { devices: this.devices.length });

    if (!this.devices.length) {
      await this.updateDevices.run();
    }
    return filterDevicesList(this.devices, "audioinput");
  }

  /**
   * Resets the cached information about the devices
   */
  reset() {
    this.devices = [];
  }

  /**
   * @param deviceId - ID of the device from MediaInputDeviceInfo
   * @returns list of available standard video resolutions for the given device
   * @internal
   */
  static async probeAvailableVideoResolutions(deviceId: string): Promise<VideoResolution[]> {
    const result: VideoResolution[] = [];
    for (const res of Object.values(STD_VIDEORES)) { // entries are sorted in ascending order of keys
      // TODO use only width or height constraints in Firefox
      await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: {
            exact: deviceId,
          },
          height: { exact: res.height },
          width: { exact: res.width },
        },
      })
        .catch(e => {
          if (e.name === "OverconstrainedError" && ["height", "width", "deviceId"].includes(e.constraint)) {
            return navigator.mediaDevices.getUserMedia({
              video: {
                deviceId: {
                  exact: deviceId,
                },
                width: { exact: res.width },
              },
            });
          }
          return Promise.reject(e);
        })
        .then((s) => {
          const { width = 0, height = 0 } = s.getVideoTracks()[0].getSettings();
          if (width && height && !result.some((r) => r.width === width && r.height === height)) {
            result.push({
              width,
              height,
            });
          }
          s.getTracks().forEach((t) => {
            s.removeTrack(t);
            t.stop();
          });
        }, (e) => {
          // TODO check error, it can be NotReadableError
          reportError(new VideoResolutionProbeError(res.width, res.height, deviceId, e));
        });
    }
    return result.reverse(); // return in descending order of resolution
  }

  /**
   * @param height - vertical resolution value
   * @returns
   * @internal
   */
  static findVideoResolution(height: number): VideoResolution | undefined {
    if (height in STD_VIDEORES) {
      return STD_VIDEORES[height];
    }
  }

  private askPermissions = new Once<void>(() => {
    trace(`${T} askPermissions run`);

    return navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    }).catch(e => {
      reportError(e);
      switch (e.name) {
        case "NotAllowedError":
        case "NotFoundError":
          // try without audio this time
          return navigator.mediaDevices.getUserMedia({ video: true })
        case "OverconstrainedError":
          const looseConstraint = e.constraint === "audio" ? { video: true } : { audio: true };
          return navigator.mediaDevices.getUserMedia(looseConstraint)
      }
      return Promise.reject(e);
    }).then(s => {
      trace(`${T} askPermissions OK`);
      s.getTracks().forEach((t) => {
        s.removeTrack(t);
        t.stop();
      });
    })
  });

  private updateDevices = new NoCollisions(async () => {
    trace(`${T} updateDevices`, {});
    return this.askPermissions.run().then(() => {
      return this.enumerateDevices.run()
    }).then((devices) => {
      this.devices = devices.filter(({ deviceId }) => !!deviceId);
      trace(`${T} updateDevices OK`, { devices: this.devices.map(d => ([d.kind, d.deviceId])) });
    });
  })

  private updateVideoResolutions = new NoCollisions<void>(async () => {
    for (const device of this.devices) {
      if (device.kind !== "videoinput" || (device.deviceId in this.videoResolutions)) {
        continue;
      }
      // TODO test that only missing devices' resolutins are queried
      const items = await MediaDevicesHelper.probeAvailableVideoResolutions(device.deviceId);
      this.videoResolutions[device.deviceId] = items;
      trace(`${T} updateVideoResolutions`, { deviceId: device.deviceId, items });
    }
  });
}

class NoCollisions<T> {
  private promise: Promise<T> | null = null;

  constructor(private fn: () => Promise<T>) { }

  run(): Promise<T> {
    if (!this.promise) {
      this.promise = this.fn().finally(() => {
        this.promise = null;
      });
    }
    return this.promise;
  }
}

class Once<T> {
  private promise: Promise<T> | null = null;

  constructor(private fn: () => Promise<T>) { }

  run(): Promise<T> {
    if (!this.promise) {
      this.promise = this.fn();
    }
    return this.promise;
  }
}

function filterDevicesList(devicesList: MediaDeviceInfo[], kind: "audioinput" | "videoinput"): MediaInputDeviceInfo[] {
  const items = devicesList.filter((devInfo) => devInfo.kind === kind).map((devInfo) => ({
    deviceId: devInfo.deviceId,
    groupId: devInfo.groupId,
    label: devInfo.label,
  }));
  return items;
}
