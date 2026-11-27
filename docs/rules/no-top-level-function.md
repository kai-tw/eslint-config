# `@kai-tw/no-top-level-function`

Disallows functions declared at the top level of a module. Behaviour belongs on a class
that callers create with `new`, so its dependencies arrive through the constructor.

Enabled as an error by `configs.recommended`.

## What it reports

Each function bound at the top level of a module:

- a `function` declaration, exported or not;
- `export function` and `export default function`, including `async` ones;
- `export default` with an arrow function or a function expression;
- a top-level `const`, `let` or `var` bound to an arrow function or a function expression,
  including one wrapped in `as` or `satisfies`.

```ts
export function total(): number {
  return 1;
}

const formatTotal = (amount: number) => `${amount}`;

export const parseInvoice = ((text: string) => text) satisfies (text: string) => string;

export default () => 1;
```

## What it does not report

- A top-level `const` holding a value: `export const MAX_ITEMS = 50`, or a schema built by a
  call.
- The result of a call, even when a function is passed into it:
  `export default wrapTask(async () => ({ total: 1 }))` and
  `const lanternTask = wrapTask(() => 1)` bind what the call returns, not a function.
- Functions inside a class, a method or another function.

```ts
export const MAX_ITEMS = 50;

export class InvoiceTotal {
  constructor(private readonly amounts: number[]) {}

  sum(): number {
    const add = (a: number, b: number) => a + b;
    return this.amounts.reduce(add, 0);
  }
}
```

## Options

Both options may be left out. Left out, they exempt nothing.

```json
{ "allowExports": ["default", "generateMetadata"], "allowComponents": true }
```

### `allowExports`

Export names whose function is not reported. `"default"` stands for the default export.
Only the export name counts: a top-level `function generateMetadata()` that is not exported
is still reported, and so is any other function in the same file. A function exported
through `export { local as name }` or `export default local` is matched by `name` or
`"default"`.

### `allowComponents`

When `true`, a React function component is not reported. A function counts as a component
when its name is PascalCase and it returns JSX: one of its own `return` statements (not one
in a nested function), or an arrow function's expression body, is a JSX element or
fragment, or a conditional (`shown ? <PriceTag /> : null`) or logical (`shown && <PriceTag />`)
expression with a JSX branch. A function that only passes JSX into a call or a constructor
is not a component.

```tsx
export function PriceTag() {
  return <span />;
}

export const ParcelBadge = ({ shown }: { shown: boolean }) => shown && <span />;
```

## Options replace each other whole

When several config objects set this rule for one file, ESLint takes the options of the
last one and drops the others; it does not merge them. An object that sets the rule for a
narrower set of files must therefore state both options. `configs.next` does this for
every object it contains.
