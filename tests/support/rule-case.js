import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';

/**
 * Runs one RuleTester case against one rule module of this package.
 *
 * Under node:test there is no global `describe` or `it`, so RuleTester runs the
 * case synchronously and throws on a mismatch, which fails the calling test.
 * The module is imported per case, so a missing module fails every case on its own.
 */
export class RuleCase {
  /** @param {string} ruleName the rule's file name under `src/rules/`, without `.js` */
  constructor(ruleName) {
    this.ruleName = ruleName;
    this.moduleUrl = new URL(`../../src/rules/${ruleName}.js`, import.meta.url);
    this.tester = new RuleTester({ languageOptions: { parser: tseslint.parser } });
  }

  /** @param {import('eslint').RuleTester.ValidTestCase} testCase */
  async valid(testCase) {
    this.tester.run(this.ruleName, await this.loadRule(), { valid: [testCase], invalid: [] });
  }

  /** @param {import('eslint').RuleTester.InvalidTestCase} testCase */
  async invalid(testCase) {
    this.tester.run(this.ruleName, await this.loadRule(), { valid: [], invalid: [testCase] });
  }

  /** @returns {Promise<import('eslint').Rule.RuleModule>} */
  async loadRule() {
    const ruleModule = await import(this.moduleUrl.href);
    return ruleModule.default;
  }
}
