# `@kai-tw/prefer-enum`

Requires an `enum` for a finite set of values, in place of an object or array marked
`as const` or a union of string literals. An enum gives the set one name that every use
site refers to.

Enabled as an error by `configs.recommended`. It has no options.

## What it reports

- An object or array literal marked `as const`.
- A union type of two or more string literals, named or inline.
- A union type of two or more string literals whose other members are only `null` or
  `undefined`. The message asks for an enum of the string literals and for the union's own
  `| null` or `| undefined` to stay where the type is used, as in `ParcelSize | null`.

```ts
const ParcelStatus = { sent: 'sent', stowed: 'stowed' } as const;

const sizes = ['S', 'M'] as const;

type ParcelSize = 'S' | 'M';

type ParcelGrade = 'A' | 'B' | null;

export class Lantern {
  ship(size: 'S' | 'M' | undefined): void {}
}
```

## What it does not report

- Enums, numeric or string.
- A single string literal, with or without `null` or `undefined`: `'S' | null`.
- A union that mixes string literals with another type: `'S' | 'M' | number`.
- A union of numeric literals, and a primitive literal marked `as const`.

```ts
export enum ParcelStatus {
  Sent = 'sent',
  Stowed = 'stowed',
}

export enum ParcelSize {
  Small = 'S',
  Medium = 'M',
}

export class Lantern {
  ship(size: ParcelSize | undefined): void {}
}

enum InvoiceDueDay {
  First = 1,
}
```
