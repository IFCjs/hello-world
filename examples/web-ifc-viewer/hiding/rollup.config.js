import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'examples/web-ifc-viewer/hiding/app.js',
  output: [
    {
      format: 'esm',
      file: 'examples/web-ifc-viewer/hiding/bundle.js'
    },
  ],
  plugins: [
    resolve(),
  ]
};