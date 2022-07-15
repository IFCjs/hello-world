import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'examples/web-ifc-three/webxr/app.js',
  output: [
    {
      format: 'esm',
      file: 'examples/web-ifc-three/webxr/bundle.js'
    },
  ],
  plugins: [
    resolve(),
  ]
};