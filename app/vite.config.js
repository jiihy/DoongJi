import { defineConfig } from 'vite';

// /s/<slug> 는 SPA 한 장이다 — 개발 서버에서도 index.html로 되돌려준다
const publicProfileFallback = () => ({
  name: 'public-profile-fallback',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (/^\/(s|r|i)\/[A-Za-z0-9_-]+\/?$/.test((req.url || '').split('?')[0])) req.url = '/';
      next();
    });
  },
});

export default defineConfig({
  plugins: [publicProfileFallback()],
  server: { port: 3000, host: true },
  build: { outDir: 'dist', sourcemap: true },
});
