// https://github.com/rollup/rollup-starter-lib
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default [
  {
    input: 'lib/index.js',
    plugins: [
      resolve({
        resolveOnly: ["cbor-x", "debug", "eventemitter3", "ms", "sdp-transform"],
      }),
      commonjs()
    ],
    output: [
      { file: 'lib/index.esm.js', format: 'es' }
    ]
  }
];