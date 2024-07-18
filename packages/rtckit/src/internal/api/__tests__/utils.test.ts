import { MockedFunction, beforeEach, describe, it, vi, expect } from "vitest";

import { fetchRetry } from "../utils.js";
import {
  BackendError,
  MalformedBackendResponseError,
} from "../errors.js";

describe("fetchRetry", () => {
  let fn: MockedFunction<() => Promise<unknown>>;
  let err: Error;
  beforeEach(() => {
    fn = vi.fn();
  })
  describe("when the response is malformed", () => {
    // E.g., proxy issue or upstream isn't functional
    it("should not retry", async () => {
      err = new MalformedBackendResponseError("");
      fn.mockRejectedValue(err);
      await expect(fetchRetry(fn)).rejects.toThrow(err);
      expect(fn).toHaveBeenCalledTimes(1);
    })
  });
  describe("common backend errors", () => {
    describe.each([
      [400, null, false],
      [404, null, false],
      [401, null, false], // consider making non-retriable, write custom retry check for chat/auth
      [403, null, false],
      [500, null, true],
      [500, { code: 301 }, false],
      [502, null, true],
      [502, { code: 301 }, false],
      [504, null, true],
      [504, { code: 301 }, false],
    ])("%s", (status, data, shouldRetry) => {
      let p: Promise<unknown>;
      beforeEach(() => {
        err = new BackendError(status, data, "cors");
        fn.mockRejectedValueOnce(err).mockResolvedValue({});
      });
      if (shouldRetry) {
        it("should retry", async () => {
          await expect(fetchRetry(fn)).resolves.toEqual({});
          expect(fn).toHaveBeenCalledTimes(2);
        });
      } else {
        it("should not retry", async () => {
          await expect(fetchRetry(fn)).rejects.toThrow(err);
          expect(fn).toHaveBeenCalledTimes(1);
        });
      }
    });
  });
  describe("non-retriable check", () => {
    it("should prevent further retries", async () => {
      err = new Error("non-retriable error");
      fn.mockRejectedValue(err);
      await expect(fetchRetry(fn, 1, 0, 0, () => false)).rejects.toThrow(
        err
      );
      expect(fn).toHaveBeenCalledTimes(1);
    });
  })
});