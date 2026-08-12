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

const BUILD = String(Date.now());

// 새 배포가 나오면 앱이 스스로 알아채도록 버전 파일을 함께 낸다
const emitVersion = () => ({
  name: 'emit-version',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD }) });
  },
});

export default defineConfig({
  define: { __BUILD__: JSON.stringify(BUILD) },
  plugins: [publicProfileFallback(), emitVersion()],
  server: { port: 3000, host: true },
  build: { outDir: 'dist', sourcemap: true },
});
