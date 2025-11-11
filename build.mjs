const isProduction = process.env.NODE_ENV === 'production';

const result = await Bun.build({
  entrypoints: ['src/cli/index.ts'],
  outdir: 'dist',
  target: 'bun',
  format: 'esm',
  external: ['playwright', 'commander', 'chalk', 'ora', 'handlebars', 'ajv', 'ajv-formats', 'fs-extra'], // Don't bundle dependencies
  minify: isProduction,
  sourcemap: isProduction ? 'none' : 'external',
});

if (!result.success) {
  console.error('Build failed:');
  for (const message of result.logs) {
    console.error(message);
  }
  process.exit(1);
}

// Add shebang to the built file
import fs from 'fs';
import path from 'path';
const builtFile = path.join('dist', 'index.js');
const content = fs.readFileSync(builtFile, 'utf8');
fs.writeFileSync(builtFile, '#!/usr/bin/env bun\n' + content);

console.log('Build completed successfully!');