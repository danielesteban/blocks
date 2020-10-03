import livereload from 'rollup-plugin-livereload';
import resolve from '@rollup/plugin-node-resolve';
import svelte from 'rollup-plugin-svelte';
import { terser } from 'rollup-plugin-terser';

const production = !process.env.ROLLUP_WATCH;

export default {
  input: 'src/main.js',
  output: {
    sourcemap: true,
    format: 'iife',
    name: 'app',
    file: 'dist/bundle.js',
  },
  plugins: [
    svelte({
      dev: !production,
      css: (css) => css.write('bundle.css'),
    }),
    resolve({
      browser: true,
      dedupe: ['svelte'],
    }),
    ...(production ? [terser()] : [livereload('dist')]),
  ],
  watch: {
    clearScreen: false,
  },
};
