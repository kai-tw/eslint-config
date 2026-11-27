# eslint-config

Kai's shared ESLint rules and configs, for ESLint 9 flat config.

## Rules

| Rule | What it reports | In `recommended` |
|---|---|---|
| [`@kai-tw/no-top-level-function`](docs/rules/no-top-level-function.md) | Functions declared at the top level of a module | error |
| [`@kai-tw/prefer-enum`](docs/rules/prefer-enum.md) | Objects and arrays marked `as const`, and unions of string literals | error |
| [`@typescript-eslint/no-extraneous-class`](https://typescript-eslint.io/rules/no-extraneous-class/) | Classes with only static members, only a constructor, or no members | error, default options |

## Install

The package is installed from a git tag:

```sh
npm install --save-dev github:kai-tw/eslint-config#v0.1.0
```

which adds this to `package.json`:

```json
{
  "devDependencies": {
    "@kai-tw/eslint-config": "github:kai-tw/eslint-config#v0.1.0"
  }
}
```

It needs `eslint` 9 as a peer, and the `@typescript-eslint` plugin registered by the
consumer's own config, for example through
[`typescript-eslint`](https://typescript-eslint.io/getting-started/) or a framework config
that includes it. `recommended` turns on `@typescript-eslint/no-extraneous-class` without
registering that plugin, because one namespace registered with two different plugin objects
is an error. Without it, ESLint stops with exit code 2 and reports that it could not find
the plugin `@typescript-eslint`.

The sources are plain JavaScript modules with JSDoc types, so nothing is built on install.

## Configs

The default export is the plugin. Its configs are arrays of flat config objects, spread into
the consumer's config.

### `configs.recommended`

Registers the `@kai-tw` plugin and turns on the three rules above as errors. It names no
`files`, so it applies to every file the consumer lints.

```js
// eslint.config.mjs
import tseslint from 'typescript-eslint';
import kaiTw from '@kai-tw/eslint-config';

export default [
  ...tseslint.configs.recommended,
  ...kaiTw.configs.recommended,
];
```

### `configs.next`

For a Next.js app. It goes after `configs.recommended`, and gives
`@kai-tw/no-top-level-function` the exemptions that Next.js file conventions and React
function components need. ESLint takes a rule's options whole from the last object that
matches a file, so each object states both options:

| Files | `allowExports` | `allowComponents` |
|---|---|---|
| `**/*.{tsx,jsx}` | none | `true` |
| `**/app/**/{page,layout}.{tsx,jsx,ts,js}` | `default`, `generateMetadata`, `generateStaticParams` | `true` |
| `**/app/**/route.{ts,js}` | `GET`, `POST`, `generateStaticParams` | `false` |
| `**/app/**/{robots,sitemap}.{ts,js}` | `default` | `false` |
| `**/app/**/opengraph-image.{tsx,jsx,ts,js}` | `default` | `true` |

Any other top-level function in these files is still reported.

```js
// eslint.config.mjs
import tseslint from 'typescript-eslint';
import kaiTw from '@kai-tw/eslint-config';

export default [
  ...tseslint.configs.recommended,
  ...kaiTw.configs.recommended,
  ...kaiTw.configs.next,
  {
    files: ['test/**'],
    rules: { '@kai-tw/no-top-level-function': 'off' },
  },
];
```

An object placed after the package's configs, like the test zone above, changes a rule for
the files it names.

## Versions

Each release is an annotated tag `vX.Y.Z` on `main`, on the commit that sets the same
`version` in `package.json`. A change to what a rule reports is a new version. Pin the tag,
as in the install line above.

## Releasing

A release is a pull request that raises `version` in `package.json`. Once it merges to
`main`, the `release-tag` workflow runs lint and the type check and creates the tag
`v<version>` on that commit. It never moves an existing tag, and it refuses a version at or
below the newest tag.

## Development

```sh
npm ci
npm test
npm run typecheck
npm run lint
```

The repository lints itself with `configs.recommended`.

## License

[MIT](LICENSE)
