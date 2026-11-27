/** @import { TSESLint } from '@typescript-eslint/utils' */
import packageJson from '../package.json' with { type: 'json' };
import noTopLevelFunction from './rules/no-top-level-function.js';
import preferEnum from './rules/prefer-enum.js';

const plugin = {
  meta: { name: packageJson.name, version: packageJson.version },
  rules: {
    'no-top-level-function': noTopLevelFunction,
    'prefer-enum': preferEnum,
  },
  /** @type {Record<string, TSESLint.FlatConfig.Config[]>} */
  configs: {},
};

Object.assign(plugin.configs, {
  recommended: [
    {
      name: '@kai-tw/recommended',
      plugins: { '@kai-tw': plugin },
      rules: {
        '@kai-tw/no-top-level-function': 'error',
        '@kai-tw/prefer-enum': 'error',
        '@typescript-eslint/no-extraneous-class': 'error',
      },
    },
  ],
  // ESLint replaces a rule's options whole when several objects match one file, so each
  // object states both options, and the widest glob comes first for the others to replace.
  next: [
    {
      name: '@kai-tw/next/components',
      files: ['**/*.{tsx,jsx}'],
      rules: {
        '@kai-tw/no-top-level-function': ['error', { allowExports: [], allowComponents: true }],
      },
    },
    {
      name: '@kai-tw/next/pages-and-layouts',
      files: ['**/app/**/{page,layout}.{tsx,jsx,ts,js}'],
      rules: {
        '@kai-tw/no-top-level-function': [
          'error',
          {
            allowExports: ['default', 'generateMetadata', 'generateStaticParams'],
            allowComponents: true,
          },
        ],
      },
    },
    {
      name: '@kai-tw/next/route-handlers',
      files: ['**/app/**/route.{ts,js}'],
      rules: {
        '@kai-tw/no-top-level-function': [
          'error',
          { allowExports: ['GET', 'POST', 'generateStaticParams'], allowComponents: false },
        ],
      },
    },
    {
      name: '@kai-tw/next/robots-and-sitemap',
      files: ['**/app/**/{robots,sitemap}.{ts,js}'],
      rules: {
        '@kai-tw/no-top-level-function': [
          'error',
          { allowExports: ['default'], allowComponents: false },
        ],
      },
    },
    {
      name: '@kai-tw/next/opengraph-images',
      files: ['**/app/**/opengraph-image.{tsx,jsx,ts,js}'],
      rules: {
        '@kai-tw/no-top-level-function': ['error', { allowExports: ['default'], allowComponents: true }],
      },
    },
  ],
});

export default plugin;
