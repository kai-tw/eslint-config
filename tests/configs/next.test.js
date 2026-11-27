import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConsumerConfig } from '../support/consumer-config.js';

const ruleId = '@kai-tw/no-top-level-function';
const nextConsumer = new ConsumerConfig(['recommended', 'next'], []);

const pageExemption = {
  allowExports: ['default', 'generateMetadata', 'generateStaticParams'],
  allowComponents: true,
};
const componentExemption = { allowExports: [], allowComponents: true };
const routeExemption = {
  allowExports: ['GET', 'POST', 'generateStaticParams'],
  allowComponents: false,
};
const defaultExportExemption = { allowExports: ['default'], allowComponents: false };
const imageExemption = { allowExports: ['default'], allowComponents: true };

const exemptionCases = [
  ['S4', 'src/presentation/price_tag.tsx', componentExemption],
  ['S4', 'src/presentation/price_tag.jsx', componentExemption],
  ['B4', 'src/app/x/page.tsx', pageExemption],
  ['S3', 'src/app/layout.tsx', pageExemption],
  ['S3', 'src/app/x/page.ts', pageExemption],
  ['S7', 'app/api/x/route.ts', routeExemption],
  ['S7', 'app/robots.ts', defaultExportExemption],
  ['S7', 'app/sitemap.ts', defaultExportExemption],
  ['S7', 'app/x/opengraph-image.tsx', imageExemption],
];

for (const [id, filePath, expected] of exemptionCases) {
  test(`[${id}] configs.next gives ${filePath} both options of its file convention`, async () => {
    const [severity, options] = await nextConsumer.ruleEntry(filePath, ruleId);
    assert.equal(severity, 2);
    assert.deepEqual(
      { allowExports: [...options.allowExports].sort(), allowComponents: options.allowComponents },
      { allowExports: [...expected.allowExports].sort(), allowComponents: expected.allowComponents },
    );
  });
}

test('[S2] configs.next exempts nothing in a plain .ts file', async () => {
  const [severity, options] = await nextConsumer.ruleEntry('src/domain/total.ts', ruleId);
  assert.equal(severity, 2);
  assert.notEqual(options?.allowComponents, true);
  assert.deepEqual(options?.allowExports ?? [], []);
});

test('[S3] page.tsx under configs.next reports only the helper beside the page exports', async () => {
  const messages = await nextConsumer.lint(
    'src/app/x/page.tsx',
    [
      'export default function Page() { return <main />; }',
      'export async function generateMetadata() { return {}; }',
      'export function generateStaticParams() { return []; }',
      'function formatTitle(title: string) { return title; }',
    ].join('\n'),
  );
  assert.deepEqual(
    messages.map((message) => [message.ruleId, message.line]),
    [[ruleId, 4]],
  );
});

test('[B4] page.tsx under configs.next reports neither generateMetadata nor a PascalCase component', async () => {
  const messages = await nextConsumer.lint(
    'src/app/x/page.tsx',
    [
      'function Heading() { return <h1 />; }',
      'export async function generateMetadata() { return {}; }',
      'export default function Page() { return <Heading />; }',
    ].join('\n'),
  );
  assert.deepEqual(messages, []);
});

test('[B2] page.tsx under configs.next does not report an export default async function', async () => {
  const messages = await nextConsumer.lint(
    'src/app/x/page.tsx',
    'export default async function Page() { return <main />; }',
  );
  assert.deepEqual(messages, []);
});

test('[B2] page.tsx under configs.next does not report an export default arrow function', async () => {
  const messages = await nextConsumer.lint('src/app/x/page.tsx', 'export default () => <main />;');
  assert.deepEqual(messages, []);
});

test('[B2] a plain file under configs.next reports an export default async function', async () => {
  const messages = await nextConsumer.lint(
    'src/domain/load.ts',
    'export default async function load() { return 1; }',
  );
  assert.deepEqual(
    messages.map((message) => [message.ruleId, message.line]),
    [[ruleId, 1]],
  );
});

test('[B2] a plain file under configs.next reports an export default arrow function', async () => {
  const messages = await nextConsumer.lint('src/domain/load.ts', 'export default () => 1;');
  assert.deepEqual(
    messages.map((message) => [message.ruleId, message.line]),
    [[ruleId, 1]],
  );
});

test('[S7] route.ts under configs.next reports only the helper beside GET, POST and generateStaticParams', async () => {
  const messages = await nextConsumer.lint(
    'app/api/x/route.ts',
    [
      'export async function GET() { return new Response(); }',
      'export async function POST() { return new Response(); }',
      'export function generateStaticParams() { return []; }',
      'async function parseWidget(request: Request) { return request.text(); }',
    ].join('\n'),
  );
  assert.deepEqual(
    messages.map((message) => [message.ruleId, message.line]),
    [[ruleId, 4]],
  );
});

test('[S7] robots.ts under configs.next reports only the helper beside the default export', async () => {
  const messages = await nextConsumer.lint(
    'app/robots.ts',
    [
      'export default function robots() { return { rules: [] }; }',
      'function readHost() { return "widget.example"; }',
    ].join('\n'),
  );
  assert.deepEqual(
    messages.map((message) => [message.ruleId, message.line]),
    [[ruleId, 2]],
  );
});

test('[S7] sitemap.ts under configs.next reports only the helper beside the default export', async () => {
  const messages = await nextConsumer.lint(
    'app/sitemap.ts',
    [
      'export default function sitemap() { return []; }',
      'function toEntry(path: string) { return { url: path }; }',
    ].join('\n'),
  );
  assert.deepEqual(
    messages.map((message) => [message.ruleId, message.line]),
    [[ruleId, 2]],
  );
});

test('[S7] opengraph-image.tsx under configs.next reports only the helper beside the default export', async () => {
  const messages = await nextConsumer.lint(
    'app/x/opengraph-image.tsx',
    [
      'export default function Image() { return new ImageFrame(<div />); }',
      'function readTitle() { return "widget"; }',
    ].join('\n'),
  );
  assert.deepEqual(
    messages.map((message) => [message.ruleId, message.line]),
    [[ruleId, 2]],
  );
});

test('[S4] a .tsx file under configs.next reports the lowercase helper and not the component', async () => {
  const messages = await nextConsumer.lint(
    'src/presentation/price_tag.tsx',
    [
      'export function PriceTag() { return <span />; }',
      'function priceLabel(price: number) { return `${price}`; }',
    ].join('\n'),
  );
  assert.deepEqual(
    messages.map((message) => [message.ruleId, message.line]),
    [[ruleId, 2]],
  );
});
