import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname), '');
  const rawPort = env.PORT || process.env.PORT || '5173';
  const port = Number(rawPort);

  const basePath = env.BASE_PATH || process.env.BASE_PATH || '/';
  const apiUrl = (env.VITE_API_URL || '/api').replace(/\/+$/, '');
  const apiOrigin = /^https?:\/\//i.test(apiUrl)
    ? new URL(apiUrl).origin
    : env.VITE_API_PROXY_TARGET || 'http://localhost:5001';

  return {
    base: basePath,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@components': path.resolve(__dirname, 'src/components'),
        '@features': path.resolve(__dirname, 'src/features'),
        '@services': path.resolve(__dirname, 'src/services'),
        '@hooks': path.resolve(__dirname, 'src/hooks'),
        '@types': path.resolve(__dirname, 'src/types'),
        '@shriram/shared': path.resolve(__dirname, '../packages/shared/src/index.ts'),
        '@shriram/api-client': path.resolve(__dirname, '../packages/api-client/src/index.ts'),
        '@workspace/api-client-react': path.resolve(__dirname, '../packages/api-client/src/index.ts'),
      },
      dedupe: ['react', 'react-dom'],
    },
    root: path.resolve(__dirname),
    build: {
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
    },
    server: {
      port,
      strictPort: true,
      proxy: {
        '/api': {
          target: apiOrigin,
          changeOrigin: true,
        },
      },
      host: '0.0.0.0',
      allowedHosts: true,
    },
  };
});
