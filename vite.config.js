import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: false,
    proxy: {
      '/media': {
        target: 'https://api.fncp.uz',
        changeOrigin: true,
        secure: true,
      },
      '^/(auth|me|users|landing-categories|referral|role|permission|event|dashboard|resources|camps|api)/.*': {
        target: 'https://api.fncp.uz',
        changeOrigin: true,
        secure: true,
        bypass: (req) => {
          if (req.headers.accept && req.headers.accept.includes('text/html')) {
            return '/index.html';
          }
        },
      },
    },
  },
  preview: {
    port: 3000,
    open: false,
    proxy: {
      '/media': {
        target: 'https://api.fncp.uz',
        changeOrigin: true,
        secure: true,
      },
      '^/(auth|me|users|landing-categories|referral|role|permission|event|dashboard|resources|camps|api)/.*': {
        target: 'https://api.fncp.uz',
        changeOrigin: true,
        secure: true,
        bypass: (req) => {
          if (req.headers.accept && req.headers.accept.includes('text/html')) {
            return '/index.html';
          }
        },
      },
    },
  },
});
