import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { ConsumerConfig } from '../support/consumer-config.js';

const recommendedConsumer = new ConsumerConfig(['recommended'], []);
const testZone = {
  files: ['test/**'],
  rules: { '@kai-tw/no-top-level-function': 'off' },
};
const wiredConsumer = new ConsumerConfig(['recommended', 'next'], [testZone]);

const helperCode = [
  'function buildWidget() { return {}; }',
  'export const makeWidget = () => buildWidget();',
].join('\n');

test('[S2] recommended reports a top-level function in a .ts file as an error', async () => {
  const messages = await recommendedConsumer.lint(
    'src/domain/total.ts',
    'export function total() { return 1; }',
  );
  assert.deepEqual(
    messages.map((message) => [message.ruleId, message.severity, message.line]),
    [['@kai-tw/no-top-level-function', 2, 1]],
  );
});

test('[S2] recommended reaches a .js file without naming files', async () => {
  const messages = await recommendedConsumer.lint(
    'src/domain/total.js',
    'export const total = () => 1;',
  );
  assert.deepEqual(
    messages.map((message) => [message.ruleId, message.severity]),
    [['@kai-tw/no-top-level-function', 2]],
  );
});

test('[S5] recommended reports a union of string literals as an error', async () => {
  const messages = await recommendedConsumer.lint(
    'src/domain/parcel.ts',
    "export type ParcelSize = 'S' | 'M';",
  );
  assert.deepEqual(
    messages.map((message) => [message.ruleId, message.severity, message.messageId]),
    [['@kai-tw/prefer-enum', 2, 'stringUnion']],
  );
});

test('[S6] recommended reports a class with only static members as an error', async () => {
  const messages = await recommendedConsumer.lint(
    'src/domain/lantern.ts',
    'export class Lantern { static total(): number { return 0; } }',
  );
  assert.deepEqual(
    messages.map((message) => [message.ruleId, message.severity]),
    [['@typescript-eslint/no-extraneous-class', 2]],
  );
});

test('[S6] recommended reports a static-only class that has a private constructor', async () => {
  const messages = await recommendedConsumer.lint(
    'src/domain/lantern.ts',
    [
      'export class Lantern {',
      '  private constructor() {}',
      '  static total(): number { return 0; }',
      '}',
    ].join('\n'),
  );
  assert.deepEqual(
    messages.map((message) => [message.ruleId, message.severity]),
    [['@typescript-eslint/no-extraneous-class', 2]],
  );
});

test('[S6] recommended does not report a class with a constructor and an instance method', async () => {
  const messages = await recommendedConsumer.lint(
    'src/domain/lantern.ts',
    [
      'export class Lantern {',
      '  constructor(private readonly items: number[]) {}',
      '  total(): number { return this.items.length; }',
      '}',
    ].join('\n'),
  );
  assert.deepEqual(messages, []);
});

test('[F1] recommended without the @typescript-eslint plugin stops ESLint with exit 2 and lints no file', async (t) => {
  const consumerRoot = await mkdtemp(join(tmpdir(), 'kai-tw-eslint-config-f1-'));
  t.after(() => rm(consumerRoot, { recursive: true, force: true }));
  const packageUrl = new URL('../../src/index.js', import.meta.url).href;
  await writeFile(
    join(consumerRoot, 'eslint.config.mjs'),
    [
      `import plugin from ${JSON.stringify(packageUrl)};`,
      'export default [plugin.configs.recommended].flat();',
    ].join('\n'),
  );
  await writeFile(join(consumerRoot, 'widget.js'), 'export const widgetCount = 1;\n');
  const eslintRoot = dirname(createRequire(import.meta.url).resolve('eslint/package.json'));
  const eslintBin = join(eslintRoot, 'bin', 'eslint.js');

  const run = spawnSync(process.execPath, [eslintBin, '--format', 'json', 'widget.js'], {
    cwd: consumerRoot,
    encoding: 'utf8',
  });

  assert.equal(run.status, 2);
  assert.match(run.stderr, /could not find plugin "@typescript-eslint"/i);
  assert.equal(run.stdout.trim(), '');
});

test('[B1] a test zone after the package configs silences top-level helpers under test/', async () => {
  const tsMessages = await wiredConsumer.lint('test/helpers.ts', helperCode);
  const tsxMessages = await wiredConsumer.lint('test/price_tag.test.tsx', helperCode);
  assert.deepEqual([...tsMessages, ...tsxMessages], []);
});

test('[B1] the same helpers outside the test zone are still reported', async () => {
  const messages = await wiredConsumer.lint('src/helpers.ts', helperCode);
  assert.deepEqual(
    messages.map((message) => [message.ruleId, message.line]),
    [
      ['@kai-tw/no-top-level-function', 1],
      ['@kai-tw/no-top-level-function', 2],
    ],
  );
});

test('[S1] a consumer wired with recommended, next and a test zone reports nothing on code that follows the rules', async () => {
  const files = [
    [
      'src/domain/lantern.ts',
      [
        "export enum ParcelStatus { Sent = 'sent', Stowed = 'stowed' }",
        'export const MAX_ITEMS = 50;',
        'export class Lantern {',
        '  constructor(private readonly items: number[]) {}',
        '  total(): number { return this.items.reduce((sum, item) => sum + item, 0); }',
        '}',
      ].join('\n'),
    ],
    [
      'src/app/x/page.tsx',
      [
        'function Heading() { return <h1 />; }',
        'export async function generateMetadata() { return {}; }',
        'export function generateStaticParams() { return []; }',
        'export default function Page() { return <Heading />; }',
      ].join('\n'),
    ],
    ['src/presentation/price_tag.tsx', 'export const PriceTag = () => <span />;'],
    ['app/api/x/route.ts', 'export async function GET() { return new Response(); }'],
    ['app/robots.ts', 'export default function robots() { return { rules: [] }; }'],
    ['test/lantern.test.ts', helperCode],
  ];

  const messages = [];
  for (const [filePath, code] of files) {
    messages.push(...(await wiredConsumer.lint(filePath, code)));
  }

  assert.deepEqual(messages, []);
});
