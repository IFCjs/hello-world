import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'examples/web-ifc-viewer/picking/app.js',
  output: [
    {
      format: 'esm',
      file: 'examples/web-ifc-viewer/picking/bundle.js',
    },
  ],
  plugins: [
    resolve(),
  ]
};