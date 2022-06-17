import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'examples/web-ifc-three/helloworld/app.js',
  output: [
    {
      format: 'esm',
      file: 'examples/web-ifc-three/helloworld/bundle.js'
    },
  ],
  plugins: [
    resolve(),
  ]
};