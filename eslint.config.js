import tseslint from 'typescript-eslint';
import plugin from './src/index.js';

export default [tseslint.configs.base, ...plugin.configs.recommended];
