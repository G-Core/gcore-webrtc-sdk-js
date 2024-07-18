import { EventEmitter } from "eventemitter3";
import { MockedFunction, describe, it, expect, beforeEach, vi } from "vitest";
import {connect} from "socket.io-client";

import { SocketConnection } from "../SocketConnection";

vi.mock("socket.io-client", () => ({
  connect: vi.fn().mockImplementation(() => Object.assign(new EventEmitter(), {
    connect: vi.fn()
  })),
  __esModule: true,
}));

describe("SocketConnection", () => {
  describe("bot", () => {
    beforeEach(() => {
      new SocketConnection("http://localhost:3000", undefined, {
        bot: "123",
        peerId: "peer1",
      });
    });
    it("should not include session token", () => {
      expect(connect).toHaveBeenCalledWith(
        "http://localhost:3000",
        expect.objectContaining({
          query: {
            bot: "123",
            peerId: "peer1",
          },
        })
      );
      expect(
        Object.keys(
          (
            connect as unknown as MockedFunction<typeof connect>
          ).mock.calls[0][1]?.query || {}
        )
      ).not.toContain("st");
    });
  });
});
