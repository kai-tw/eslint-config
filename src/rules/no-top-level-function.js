/** @import { TSESLint, TSESTree } from '@typescript-eslint/utils' */

/**
 * @typedef {object} NoTopLevelFunctionOptions
 * @property {string[]} [allowExports] export names whose function is not reported; `"default"` is the default export
 * @property {boolean} [allowComponents] whether a PascalCase function that returns JSX is not reported
 */

/**
 * @typedef {TSESTree.ArrowFunctionExpression | TSESTree.FunctionDeclaration | TSESTree.FunctionExpression} FunctionNode
 */

/**
 * A function bound at the top level of a module, by a declaration, a variable or a default export.
 * @typedef {object} TopLevelFunctionBinding
 * @property {TSESTree.Node} reportNode
 * @property {FunctionNode} functionNode
 * @property {string | null} bindingName null for an anonymous default export
 * @property {string[]} exportNames the names the statement holding it exports it under
 */

const functionNodeTypes = new Set(['ArrowFunctionExpression', 'FunctionDeclaration', 'FunctionExpression']);
const pascalCaseName = /^[A-Z][A-Za-z0-9]*$/;

class TopLevelFunctionReporter {
  /** @param {Readonly<TSESLint.RuleContext<'topLevelFunction', [NoTopLevelFunctionOptions?]>>} context */
  constructor(context) {
    const [options] = context.options;
    this.context = context;
    // Both options may be left out, and each one left out exempts nothing.
    this.allowedExportNames = new Set(options?.allowExports ?? []);
    this.allowsComponents = options?.allowComponents ?? false;
    /** @type {Set<TSESTree.Node>} */
    this.functionsReturningJsx = new Set();
  }

  /** @param {TSESTree.ReturnStatement} returnStatement */
  recordReturn(returnStatement) {
    if (!this.isJsxValue(returnStatement.argument)) {
      return;
    }
    const owner = this.context.sourceCode
      .getAncestors(returnStatement)
      .findLast((ancestor) => functionNodeTypes.has(ancestor.type));
    // A script parsed with `globalReturn` can return outside any function.
    if (owner !== undefined) {
      this.functionsReturningJsx.add(owner);
    }
  }

  /** @param {TSESTree.Program} program */
  reportProgram(program) {
    const specifierExportNames = this.exportNamesBySpecifier(program);
    for (const statement of program.body) {
      for (const binding of this.bindingsOf(statement)) {
        const exportNames =
          binding.bindingName === null
            ? binding.exportNames
            : [...binding.exportNames, ...(specifierExportNames.get(binding.bindingName) ?? [])];
        if (exportNames.some((name) => this.allowedExportNames.has(name))) {
          continue;
        }
        if (this.allowsComponents && this.isComponent(binding)) {
          continue;
        }
        this.context.report({
          node: binding.reportNode,
          messageId: 'topLevelFunction',
          data: { name: binding.bindingName ?? 'default' },
        });
      }
    }
  }

  /**
   * Local names exported by `export { local as name }` or `export default local`.
   * @param {TSESTree.Program} program
   * @returns {Map<string, string[]>}
   */
  exportNamesBySpecifier(program) {
    /** @type {Map<string, string[]>} */
    const exportNames = new Map();
    for (const statement of program.body) {
      if (statement.type === 'ExportNamedDeclaration' && statement.source === null) {
        for (const specifier of statement.specifiers) {
          const localName = this.moduleExportName(specifier.local);
          exportNames.set(localName, [
            ...(exportNames.get(localName) ?? []),
            this.moduleExportName(specifier.exported),
          ]);
        }
      } else if (
        statement.type === 'ExportDefaultDeclaration' &&
        statement.declaration.type === 'Identifier'
      ) {
        const localName = statement.declaration.name;
        exportNames.set(localName, [...(exportNames.get(localName) ?? []), 'default']);
      }
    }
    return exportNames;
  }

  /**
   * @param {TSESTree.ProgramStatement} statement
   * @returns {TopLevelFunctionBinding[]}
   */
  bindingsOf(statement) {
    switch (statement.type) {
      case 'FunctionDeclaration':
        return [this.declarationBinding(statement)];
      case 'VariableDeclaration':
        return this.variableBindings(statement);
      case 'ExportNamedDeclaration':
        if (statement.declaration?.type === 'FunctionDeclaration') {
          return [this.declarationBinding(statement.declaration)];
        }
        if (statement.declaration?.type === 'VariableDeclaration') {
          return this.variableBindings(statement.declaration);
        }
        return [];
      case 'ExportDefaultDeclaration':
        return this.defaultExportBindings(statement.declaration);
      default:
        return [];
    }
  }

  /**
   * @param {TSESTree.FunctionDeclaration} declaration
   * @returns {TopLevelFunctionBinding}
   */
  declarationBinding(declaration) {
    // Only `export default function () {}` declares a function without a name.
    if (declaration.id === null) {
      return {
        reportNode: declaration,
        functionNode: declaration,
        bindingName: null,
        exportNames: ['default'],
      };
    }
    return {
      reportNode: declaration,
      functionNode: declaration,
      bindingName: declaration.id.name,
      exportNames: this.ownExportNames(declaration, declaration.id.name),
    };
  }

  /**
   * @param {TSESTree.VariableDeclaration} declaration
   * @returns {TopLevelFunctionBinding[]}
   */
  variableBindings(declaration) {
    /** @type {TopLevelFunctionBinding[]} */
    const bindings = [];
    for (const declarator of declaration.declarations) {
      if (declarator.id.type !== 'Identifier' || declarator.init === null) {
        continue;
      }
      const functionNode = this.functionExpressionOf(declarator.init);
      if (functionNode === null) {
        continue;
      }
      bindings.push({
        reportNode: declarator,
        functionNode,
        bindingName: declarator.id.name,
        exportNames: this.ownExportNames(declaration, declarator.id.name),
      });
    }
    return bindings;
  }

  /**
   * @param {TSESTree.DefaultExportDeclarations} declaration
   * @returns {TopLevelFunctionBinding[]}
   */
  defaultExportBindings(declaration) {
    if (declaration.type === 'FunctionDeclaration') {
      return [this.declarationBinding(declaration)];
    }
    const functionNode = this.functionExpressionOf(declaration);
    if (functionNode === null) {
      return [];
    }
    return [{ reportNode: functionNode, functionNode, bindingName: null, exportNames: ['default'] }];
  }

  /**
   * The names the statement holding a declaration exports it under.
   * @param {TSESTree.FunctionDeclaration | TSESTree.VariableDeclaration} declaration
   * @param {string} bindingName
   * @returns {string[]}
   */
  ownExportNames(declaration, bindingName) {
    switch (declaration.parent.type) {
      case 'ExportDefaultDeclaration':
        return ['default'];
      case 'ExportNamedDeclaration':
        return [bindingName];
      default:
        return [];
    }
  }

  /**
   * The function a node evaluates to, seen through `as` and `satisfies`; null when it is
   * anything else, such as the result of a call.
   * @param {TSESTree.Node} node
   * @returns {TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression | null}
   */
  functionExpressionOf(node) {
    let inner = node;
    while (inner.type === 'TSAsExpression' || inner.type === 'TSSatisfiesExpression') {
      inner = inner.expression;
    }
    if (inner.type === 'ArrowFunctionExpression' || inner.type === 'FunctionExpression') {
      return inner;
    }
    return null;
  }

  /** @param {TopLevelFunctionBinding} binding */
  isComponent(binding) {
    if (binding.bindingName === null || !pascalCaseName.test(binding.bindingName)) {
      return false;
    }
    const { body } = binding.functionNode;
    if (body.type === 'BlockStatement') {
      return this.functionsReturningJsx.has(binding.functionNode);
    }
    return this.isJsxValue(body);
  }

  /**
   * Whether the value is JSX, or a conditional or logical expression with a JSX branch.
   * @param {TSESTree.Node | null} value
   * @returns {boolean}
   */
  isJsxValue(value) {
    if (value === null) {
      return false;
    }
    switch (value.type) {
      case 'JSXElement':
      case 'JSXFragment':
        return true;
      case 'ConditionalExpression':
        return this.isJsxValue(value.consequent) || this.isJsxValue(value.alternate);
      case 'LogicalExpression':
        return this.isJsxValue(value.left) || this.isJsxValue(value.right);
      default:
        return false;
    }
  }

  /** @param {TSESTree.Identifier | TSESTree.StringLiteral} name */
  moduleExportName(name) {
    return name.type === 'Identifier' ? name.name : name.value;
  }
}

/** @type {TSESLint.RuleModule<'topLevelFunction', [NoTopLevelFunctionOptions?]>} */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow functions declared at the top level of a module',
      url: 'https://github.com/kai-tw/eslint-config/blob/main/docs/rules/no-top-level-function.md',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowExports: { type: 'array', items: { type: 'string' }, uniqueItems: true },
          allowComponents: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      topLevelFunction:
        "Top-level function '{{name}}'. Put it on a class that callers create with `new`.",
    },
  },
  create(context) {
    const reporter = new TopLevelFunctionReporter(context);
    return {
      ReturnStatement: (node) => reporter.recordReturn(node),
      'Program:exit': (node) => reporter.reportProgram(node),
    };
  },
};
