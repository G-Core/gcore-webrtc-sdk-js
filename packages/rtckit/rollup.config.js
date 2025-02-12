// https://github.com/rollup/rollup-starter-lib
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";

export default [
  {
    input: "lib/index.js",
    plugins: [
      resolve({
        resolveOnly: [
          "@gcorevideo/utils",
          "cbor-x",
          "debug",
          "eventemitter3",
          "ms",
          "sdp-transform",
        ],
      }),
      commonjs(),
      json(),
    ],
    output: [{ file: "lib/index.esm.js", format: "es" }],
  },
];
