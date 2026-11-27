import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';

/**
 * The flat config a consumer writes: typescript-eslint's parser and plugin, a `files`
 * entry for TypeScript and JSX, the named configs of this package in the order given,
 * then the consumer's own objects.
 */
export class ConsumerConfig {
  /**
   * @param {string[]} configNames keys of the package's `configs`, spread in this order
   * @param {import('eslint').Linter.Config[]} consumerObjects objects placed after the package's configs
   */
  constructor(configNames, consumerObjects) {
    this.configNames = configNames;
    this.consumerObjects = consumerObjects;
    this.cwd = fileURLToPath(new URL('../..', import.meta.url));
  }

  /**
   * The rule's entry as ESLint computes it for the file, severity normalized to a number.
   * @param {string} filePath relative to the consumer's root
   * @param {string} ruleId
   */
  async ruleEntry(filePath, ruleId) {
    const eslint = await this.createESLint();
    const config = await eslint.calculateConfigForFile(filePath);
    return config.rules[ruleId];
  }

  /**
   * Every message ESLint reports for the code at the path. A parse error fails the test,
   * so a broken fixture is never read as "nothing reported".
   * @param {string} filePath relative to the consumer's root; the file need not exist
   * @param {string} code
   */
  async lint(filePath, code) {
    const eslint = await this.createESLint();
    const [result] = await eslint.lintText(code, { filePath });
    assert.deepEqual(result.messages.filter((message) => message.fatal), []);
    return result.messages;
  }

  async createESLint() {
    const { default: plugin } = await import('@kai-tw/eslint-config');
    const packageObjects = this.configNames.flatMap((name) => [plugin.configs[name]].flat());
    return new ESLint({
      cwd: this.cwd,
      overrideConfigFile: true,
      overrideConfig: [
        tseslint.configs.base,
        { files: ['**/*.ts', '**/*.tsx', '**/*.jsx'] },
        ...packageObjects,
        ...this.consumerObjects,
      ],
    });
  }
}
