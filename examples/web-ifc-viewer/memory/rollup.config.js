import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'examples/web-ifc-viewer/memory/app.js',
  output: [
    {
      format: 'esm',
      file: 'examples/web-ifc-viewer/memory/bundle.js',
    },
  ],
  plugins: [
    resolve(),
  ]
};