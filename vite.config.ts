import { defineConfig, type Plugin } from 'vite';
import { fileURLToPath } from 'node:url';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

/** Dev-only: POST a data URL to /__shot?name=foo to save a screenshot to .dev-shots/. */
function devScreenshotPlugin(): Plugin {
  return {
    name: 'dev-screenshot',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__shot', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('POST only');
          return;
        }
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          try {
            const url = new URL(req.url ?? '/', 'http://localhost');
            const name = (url.searchParams.get('name') ?? 'shot').replace(/[^\w-]/g, '_');
            const b64 = body.replace(/^data:image\/\w+;base64,/, '');
            const dir = join(process.cwd(), '.dev-shots');
            mkdirSync(dir, { recursive: true });
            const file = join(dir, `${name}.png`);
            writeFileSync(file, Buffer.from(b64, 'base64'));
            res.setHeader('content-type', 'text/plain');
            res.end(file);
          } catch (e) {
            res.statusCode = 500;
            res.end(String(e));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [devScreenshotPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: Number(process.env.PORT) || 5173,
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
  },
});
