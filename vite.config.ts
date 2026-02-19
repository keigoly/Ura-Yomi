import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { copyFileSync, mkdirSync, cpSync, renameSync, rmSync, existsSync, readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [
    react(),
    {
      name: 'copy-extension-files',
      closeBundle() {
        const distDir = resolve(__dirname, 'dist');
        const srcDir = resolve(__dirname, 'src');

        // manifest.jsonをコピー（本番ビルド時はlocalhostを除去）
        const manifestSrc = resolve(srcDir, 'manifest.json');
        const manifestDest = resolve(distDir, 'manifest.json');
        const isProduction = mode === 'production';
        if (isProduction) {
          const manifest = JSON.parse(readFileSync(manifestSrc, 'utf-8'));
          if (manifest.host_permissions) {
            manifest.host_permissions = manifest.host_permissions.filter(
              (p: string) => !p.includes('localhost') && !p.includes('127.0.0.1')
            );
          }
          writeFileSync(manifestDest, JSON.stringify(manifest, null, 2), 'utf-8');
        } else {
          copyFileSync(manifestSrc, manifestDest);
        }

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

        // _localesフォルダをコピー
        cpSync(
          resolve(srcDir, '_locales'),
          resolve(distDir, '_locales'),
          { recursive: true }
        );

        // HTMLファイルをdist/src/からdist/に移動
        const htmlFiles = ['popup.html', 'sidepanel.html', 'settings.html'];
        htmlFiles.forEach((file) => {
          const srcPath = resolve(distDir, 'src', file);
          const destPath = resolve(distDir, file);
          if (existsSync(srcPath)) {
            renameSync(srcPath, destPath);
            
            // HTMLファイル内のパスを修正（../を./に、/を./に）
            let htmlContent = readFileSync(destPath, 'utf-8');
            htmlContent = htmlContent.replace(/href="\.\.\//g, 'href="./');
            htmlContent = htmlContent.replace(/src="\.\.\//g, 'src="./');
            htmlContent = htmlContent.replace(/href="\//g, 'href="./');
            htmlContent = htmlContent.replace(/src="\//g, 'src="./');
            writeFileSync(destPath, htmlContent, 'utf-8');
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
        content: resolve(__dirname, 'src/content/content.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'content' ? 'content.js' : '[name].js';
        },
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
}));
