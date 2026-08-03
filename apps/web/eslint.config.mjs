import { FlatCompat } from '@eslint/eslintrc';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const compat = new FlatCompat({
  baseDirectory: path.dirname(fileURLToPath(import.meta.url)),
});

const config = [
  ...compat.extends('next/core-web-vitals'),
  {
    rules: {
      // 项目图片为外链占位图且 next.config 已关闭优化，next/image 无收益
      '@next/next/no-img-element': 'off',
    },
  },
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
      'lib/qrcode-generator.js',
      'tests/**',
    ],
  },
];

export default config;
