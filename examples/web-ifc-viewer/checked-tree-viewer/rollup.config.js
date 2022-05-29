import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'examples/web-ifc-viewer/checked-tree-selector/app.js',
  output: [
    {
      format: 'esm',
      file: 'examples/web-ifc-viewer/checked-tree-selector/bundle.js'
    },
  ],
  plugins: [
    resolve(),
  ]
};