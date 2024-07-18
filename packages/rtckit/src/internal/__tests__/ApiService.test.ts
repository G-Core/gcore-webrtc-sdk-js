import { MockedFunction, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FakeTimers from "@sinonjs/fake-timers";

import { ApiService } from "../ApiService.js";
import { BackendError } from "../api/errors.js";

describe("ApiService", () => {
  let apiService: ApiService;
  let clock: FakeTimers.InstalledClock;
  let spyFetch: MockedFunction<typeof fetch>;
  beforeEach(() => {
    clock = FakeTimers.install();
    spyFetch = vi.fn();
    // @ts-expect-error
    global.fetch = spyFetch as unknown as typeof fetch;
    apiService = new ApiService("https://api.gcore.com/streaming/videocalls");
  });
  afterEach(() => {
    clock.uninstall();
  });
  function setupRetries(finalResp: unknown) {
    for (let i = 0; i < 11; i++) {
      spyFetch.mockResolvedValueOnce({
        ok: false,
        status: 504,
        type: "cors",
        json: () => Promise.resolve(null),
      } as Response);
    }
    spyFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([["content-type", "application/json"]]),
      json: () => Promise.resolve(finalResp),
    } as unknown as Response);
  }
  describe("getSessionConfig", () => {
    beforeEach(() => {
      setupRetries({
        authOptions: {},
        chatOptions: {},
        options: {},
        chatSaveMode: "Delete",
      });
    });
    it("should retry using exponential backoff", async () => {
      const p = apiService.getSessionConfig("sessionToken");
      p.catch(() => {}); // prevent unhandled rejection
      await clock.tickAsync(0);
      expect(spyFetch).toHaveBeenCalledTimes(1);
      await clock.tickAsync(200);
      expect(spyFetch).toHaveBeenCalledTimes(2);
      await clock.tickAsync(400);
      expect(spyFetch).toHaveBeenCalledTimes(3);
      await clock.tickAsync(750);
      expect(spyFetch).toHaveBeenCalledTimes(4);
      await clock.tickAsync(1250);
      expect(spyFetch).toHaveBeenCalledTimes(5);
      await clock.tickAsync(10000);
      expect(spyFetch).toHaveBeenCalledTimes(12);
      await expect(p).resolves.toEqual({
        authOptions: {},
        chatOptions: {},
        options: {},
        chatSaveMode: "Delete",
      });
    });
  });
  describe("initSession", () => {
    describe("retries", () => {
      beforeEach(() => {
        setupRetries({
          authOptions: {},
          chatOptions: {},
          options: {},
          chatSaveMode: "Delete",
        });
      });
      it("should retry using exponential backoff", async () => {
        const p = apiService.initSession({
          hostname: "hostname",
          roomId: "roomId",
        });
        p.catch(() => {}); // prevent unhandled rejection
        await clock.tickAsync(0);
        expect(spyFetch).toHaveBeenCalledTimes(1);
        await clock.tickAsync(200);
        expect(spyFetch).toHaveBeenCalledTimes(2);
        await clock.tickAsync(400);
        expect(spyFetch).toHaveBeenCalledTimes(3);
        await clock.tickAsync(750);
        expect(spyFetch).toHaveBeenCalledTimes(4);
        await clock.tickAsync(1250);
        expect(spyFetch).toHaveBeenCalledTimes(5);
        await clock.tickAsync(10000);
        expect(spyFetch).toHaveBeenCalledTimes(12);
        await expect(p).resolves.toEqual({
          authOptions: {},
          chatOptions: {},
          options: {},
          chatSaveMode: "Delete",
        });
      });
    });
    describe("extra params", () => {
      beforeEach(() => {
        spyFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          type: "cors",
          json: () => Promise.resolve({}),
        } as Response);
        apiService.initSession(
          {
            hostname: "hostname",
            roomId: "roomId",
            peerId: "peerId",
            isParticipant: true,
            webinar: true,
            pincode: "pincode",
          },
          {
            region: "ed",
          },
        );
      });
      it("should pass extra params to the API method", () => {
        expect(spyFetch).toHaveBeenCalledWith(expect.stringMatching(/\bregion=ed\b/), {
          headers: undefined,
          method: "POST",
        });
      });
    });
  });
  describe.skip("toggleStreamRecording", () => {
    // TODO
  });
  describe.skip("getStreamRecordingStatus", () => {
    // TODO
  });
  describe("getChatAuthToken", () => {
    describe.each([
      [500, true],
      [502, true],
      [504, true],
      [400, false],
      [401, true],
      [403, true],
      [404, false],
    ])("%s", (status, shouldRetry) => {
      let p: Promise<unknown>;
      beforeEach(async () => {
        spyFetch
          .mockResolvedValueOnce({
            ok: false,
            status,
            type: "cors",
            json: () => Promise.resolve(null),
          } as Response)
          .mockResolvedValue({
            ok: true,
            status: 200,
            headers: new Map([
              ["content-type", "application/json"],
            ]),
            json: () => Promise.resolve({ chatAuthToken: "chatAuthToken" }),
          } as unknown as Response);
        p = apiService.getChatAuthToken("sessionToken");
        p.catch(() => {});
      });
      if (shouldRetry) {
        it("should retry", async () => {
          await clock.tickAsync(200);
          expect(spyFetch).toHaveBeenCalledTimes(2);
          await expect(p).resolves.toEqual({
            chatAuthToken: "chatAuthToken",
          });
        });
      } else {
        it("should not retry", async () => {
          await expect(p).rejects.toThrow(BackendError);
          expect(spyFetch).toHaveBeenCalledTimes(1);
        });
      }
    });
  });
});
