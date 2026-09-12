import { build } from 'esbuild';
import { rmSync } from 'node:fs';

const out = 'dist/serverless.bundle.cjs';

try {
  rmSync(out, { force: true });
} catch {
  /* ignore */
}

await build({
  entryPoints: ['dist/serverless.js'],
  outfile: out,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  define: {
    'import.meta.url': '"file:///C:/var/task/x.js"',
  },
  external: [
    '@prisma/client',
    '@prisma/engines',
    '.prisma/client',
    '@nestjs/platform-express',
    '@nestjs/microservices',
    '@nestjs/websockets',
    '@fastify/view',
  ],
  logLevel: 'info',
});

console.log('bundled', out);