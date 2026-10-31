import fs from 'node:fs';
import { transformSync } from 'esbuild';

const source = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
transformSync(source, { loader: 'jsx', target: 'es2022' });
console.log('Client JSX parsed successfully.');
