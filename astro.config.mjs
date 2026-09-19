// @ts-check
import { defineConfig } from 'astro/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

import tailwindcss from '@tailwindcss/vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

function localDevSavePlugin() {
  return {
    name: 'local-dev-save-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/save-local' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              const changes = data.changes || [];

              for (const change of changes) {
                if (!change.path) continue;
                const safePath = path.normalize(change.path).replace(/^(\.\.[\/\\])+/, '');
                const filePath = path.resolve(projectRoot, safePath);

                if (change.delete) {
                  if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                  }
                  continue;
                }

                const dir = path.dirname(filePath);
                if (!fs.existsSync(dir)) {
                  fs.mkdirSync(dir, { recursive: true });
                }

                if (change.encoding === 'base64') {
                  const buffer = Buffer.from(change.content, 'base64');
                  fs.writeFileSync(filePath, buffer);
                } else {
                  fs.writeFileSync(filePath, change.content || '', 'utf-8');
                }
              }

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
        } else {
          next();
        }
      });
    },
  };
}

// https://astro.build/config
export default defineConfig({
  site: 'https://fractalia-iota.vercel.app',
  output: 'static',
  devToolbar: {
    enabled: false,
  },
  integrations: [
    react(),
    sitemap({
      filter: (page) => !page.includes('/404'),
    }),
  ],

  vite: {
    plugins: [tailwindcss(), localDevSavePlugin()]
  }
});