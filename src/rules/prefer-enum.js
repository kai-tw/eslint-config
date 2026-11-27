/** @import { TSESLint, TSESTree } from '@typescript-eslint/utils' */

/** @typedef {'constAssertion' | 'stringUnion' | 'nullableStringUnion'} PreferEnumMessageId */

class StringSetReporter {
  /** @param {Readonly<TSESLint.RuleContext<PreferEnumMessageId, []>>} context */
  constructor(context) {
    this.context = context;
  }

  /** @param {TSESTree.TSAsExpression} assertion */
  reportConstAssertion(assertion) {
    const { expression, typeAnnotation } = assertion;
    const isConstAssertion =
      typeAnnotation.type === 'TSTypeReference' &&
      typeAnnotation.typeName.type === 'Identifier' &&
      typeAnnotation.typeName.name === 'const';
    if (!isConstAssertion) {
      return;
    }
    if (expression.type !== 'ObjectExpression' && expression.type !== 'ArrayExpression') {
      return;
    }
    this.context.report({ node: assertion, messageId: 'constAssertion' });
  }

  /**
   * Reports a union of two or more string literals whose other members are only `null` or
   * `undefined`; one literal is not a set.
   * @param {TSESTree.TSUnionType} union
   */
  reportUnion(union) {
    let stringLiteralCount = 0;
    /** @type {string[]} */
    const emptyMembers = [];
    for (const member of union.types) {
      if (
        member.type === 'TSLiteralType' &&
        member.literal.type === 'Literal' &&
        typeof member.literal.value === 'string'
      ) {
        stringLiteralCount += 1;
      } else if (member.type === 'TSNullKeyword') {
        emptyMembers.push('null');
      } else if (member.type === 'TSUndefinedKeyword') {
        emptyMembers.push('undefined');
      } else {
        return;
      }
    }
    if (stringLiteralCount < 2) {
      return;
    }
    if (emptyMembers.length === 0) {
      this.context.report({ node: union, messageId: 'stringUnion' });
      return;
    }
    this.context.report({
      node: union,
      messageId: 'nullableStringUnion',
      data: { emptyMembers: emptyMembers.join(' | ') },
    });
  }
}

/** @type {TSESLint.RuleModule<PreferEnumMessageId, []>} */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require an enum for a finite set of values instead of `as const` or a string literal union',
      url: 'https://github.com/kai-tw/eslint-config/blob/main/docs/rules/prefer-enum.md',
    },
    schema: [],
    messages: {
      constAssertion: 'Declare an enum for this set of values instead of marking a literal `as const`.',
      stringUnion: 'Declare an enum for these string literals instead of a union type.',
      nullableStringUnion:
        'Declare an enum for these string literals, and keep `| {{emptyMembers}}` where the type is used.',
    },
  },
  create(context) {
    const reporter = new StringSetReporter(context);
    return {
      TSAsExpression: (node) => reporter.reportConstAssertion(node),
      TSUnionType: (node) => reporter.reportUnion(node),
    };
  },
};
