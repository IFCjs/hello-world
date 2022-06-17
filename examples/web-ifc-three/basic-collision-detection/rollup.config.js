import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'examples/web-ifc-three/basic-collision-detection/app.js',
  output: [
    {
      format: 'esm',
      file: 'examples/web-ifc-three/basic-collision-detection/bundle.js'
    },
  ],
  plugins: [
    resolve(),
  ]
};