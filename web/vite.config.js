import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function gasDevGuardPlugin(gasUrl) {
  return {
    name: 'gas-dev-guard',
    configureServer(server) {
      if (gasUrl) return;
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/gas')) return next();
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({
          success: false,
          error: 'Thieu VITE_GAS_URL trong web/.env.local khi chay npm run dev.',
        }));
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const gasUrl = env.VITE_GAS_URL || '';

  return {
    plugins: [react(), gasDevGuardPlugin(gasUrl)],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            icons: ['lucide-react'],
            sanitize: ['dompurify'],
          },
        },
      },
    },
  };
});
