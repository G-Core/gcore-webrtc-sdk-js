import { defineEventHandler } from "h3";

import gcore from "../utils/gcore-api";

export default defineEventHandler(async event => {
  const body = await readBody(event);
  const id = body?.id;
  if (!id) {
    throw createError({
      status: 400,
    });
  }
  await gcore().webrtc.toggleStream(id, true);
  return {
    status: 204,
  };
})
