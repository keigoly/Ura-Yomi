import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { copyFileSync, mkdirSync, cpSync, renameSync, rmSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-extension-files',
      closeBundle() {
        const distDir = resolve(__dirname, 'dist');
        const srcDir = resolve(__dirname, 'src');

        // manifest.jsonをコピー
        copyFileSync(
          resolve(srcDir, 'manifest.json'),
          resolve(distDir, 'manifest.json')
        );

        // iconsフォルダをコピー
        mkdirSync(resolve(distDir, 'icons'), { recursive: true });
        cpSync(
          resolve(srcDir, 'icons'),
          resolve(distDir, 'icons'),
          { recursive: true }
        );

        // background.jsをコピー
        copyFileSync(
          resolve(srcDir, 'background.js'),
          resolve(distDir, 'background.js')
        );

        // HTMLファイルをdist/src/からdist/に移動
        const htmlFiles = ['popup.html', 'sidepanel.html', 'settings.html'];
        htmlFiles.forEach((file) => {
          const srcPath = resolve(distDir, 'src', file);
          const destPath = resolve(distDir, file);
          if (existsSync(srcPath)) {
            renameSync(srcPath, destPath);
          }
        });

        // 空のsrcフォルダを削除
        const emptySrcDir = resolve(distDir, 'src');
        if (existsSync(emptySrcDir)) {
          rmSync(emptySrcDir, { recursive: true });
        }
      },
    },
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup.html'),
        sidepanel: resolve(__dirname, 'src/sidepanel.html'),
        settings: resolve(__dirname, 'src/settings.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].[hash].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
